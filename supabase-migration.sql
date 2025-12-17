-- ============================================================================
-- CUEOUT APP - SUPABASE DATABASE MIGRATION
-- ============================================================================
-- This migration creates all necessary tables, relationships, indexes,
-- Row Level Security policies, and seed data for the CueOut application.
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  country_code TEXT DEFAULT '+1',
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'plus')),
  creator_mode_enabled BOOLEAN DEFAULT false,
  notifications_enabled BOOLEAN DEFAULT true,
  selected_ringtone TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- VOICES TABLE
-- ============================================================================
CREATE TABLE public.voices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('realistic', 'character')),
  gender TEXT CHECK (gender IN ('male', 'female')),
  type TEXT,
  icon TEXT NOT NULL,
  description TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PERSONAS TABLE
-- ============================================================================
CREATE TABLE public.personas (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PERSONA_CONFIGS TABLE
-- ============================================================================
CREATE TABLE public.persona_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  persona_id TEXT NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  tone TEXT DEFAULT 'casual' CHECK (tone IN ('formal', 'casual', 'urgent', 'friendly', 'concerned', 'excited')),
  background_sound TEXT DEFAULT 'none' CHECK (background_sound IN ('none', 'office', 'cafe', 'street', 'home', 'airport')),
  duration_seconds INTEGER DEFAULT 30 CHECK (duration_seconds BETWEEN 15 AND 120),
  custom_phrases JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(persona_id, user_id)
);

-- ============================================================================
-- CALLER_IDS TABLE
-- ============================================================================
CREATE TABLE public.caller_ids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- UPCOMING_CALLS TABLE
-- ============================================================================
CREATE TABLE public.upcoming_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  persona_id TEXT NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  voice_id TEXT NOT NULL REFERENCES public.voices(id),
  caller_id UUID REFERENCES public.caller_ids(id) ON DELETE SET NULL,
  contact_methods JSONB DEFAULT '["call"]'::jsonb,
  context_note TEXT,
  due_timestamp TIMESTAMPTZ NOT NULL,
  tone TEXT,
  background_sound TEXT,
  duration_seconds INTEGER DEFAULT 30,
  voice_category TEXT CHECK (voice_category IN ('realistic', 'character')),
  is_new BOOLEAN DEFAULT true,
  is_editing BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CALL_HISTORY TABLE
-- ============================================================================
CREATE TABLE public.call_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  persona_id TEXT NOT NULL REFERENCES public.personas(id),
  voice_id TEXT NOT NULL REFERENCES public.voices(id),
  caller_id UUID REFERENCES public.caller_ids(id) ON DELETE SET NULL,
  contact_methods JSONB DEFAULT '["call"]'::jsonb,
  context_note TEXT,
  status TEXT DEFAULT 'answered' CHECK (status IN ('answered', 'missed')),
  duration_seconds INTEGER,
  scheduled_time TIMESTAMPTZ,
  completed_at TIMESTAMPTZ NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- QUICK_SCHEDULES TABLE
-- ============================================================================
CREATE TABLE public.quick_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  persona_id TEXT NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  voice_id TEXT NOT NULL REFERENCES public.voices(id),
  caller_id UUID REFERENCES public.caller_ids(id) ON DELETE SET NULL,
  contact_methods JSONB DEFAULT '["call"]'::jsonb,
  context_note TEXT,
  time_preset TEXT DEFAULT 'now' CHECK (time_preset IN ('now', '3min', '5min', 'custom')),
  voice_category TEXT CHECK (voice_category IN ('realistic', 'character')),
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'plus')),
  calls_remaining INTEGER DEFAULT 2,
  calls_limit INTEGER DEFAULT 2,
  texts_remaining INTEGER DEFAULT 0,
  texts_limit INTEGER DEFAULT 0,
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT false,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CALL_USAGE TABLE (for analytics and billing)
-- ============================================================================
CREATE TABLE public.call_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  call_id UUID REFERENCES public.call_history(id) ON DELETE SET NULL,
  method_type TEXT NOT NULL CHECK (method_type IN ('call', 'text', 'email')),
  tokens_used INTEGER,
  cost_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PHONE_VERIFICATIONS TABLE (for phone number verification)
-- ============================================================================
CREATE TABLE public.phone_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT '+1',
  code_hash TEXT NOT NULL,
  luron_call_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_phone_number ON public.users(phone_number);

-- Personas
CREATE INDEX idx_personas_user_id ON public.personas(user_id);
CREATE INDEX idx_personas_is_default ON public.personas(is_default);

-- Persona Configs
CREATE INDEX idx_persona_configs_user_id ON public.persona_configs(user_id);
CREATE INDEX idx_persona_configs_persona_id ON public.persona_configs(persona_id);

-- Caller IDs
CREATE INDEX idx_caller_ids_user_id ON public.caller_ids(user_id);

-- Upcoming Calls
CREATE INDEX idx_upcoming_calls_user_id ON public.upcoming_calls(user_id);
CREATE INDEX idx_upcoming_calls_due_timestamp ON public.upcoming_calls(due_timestamp);
CREATE INDEX idx_upcoming_calls_persona_id ON public.upcoming_calls(persona_id);

-- Call History
CREATE INDEX idx_call_history_user_id ON public.call_history(user_id);
CREATE INDEX idx_call_history_completed_at ON public.call_history(completed_at DESC);
CREATE INDEX idx_call_history_is_read ON public.call_history(is_read) WHERE is_read = false;

-- Quick Schedules
CREATE INDEX idx_quick_schedules_user_id ON public.quick_schedules(user_id);
CREATE INDEX idx_quick_schedules_usage_count ON public.quick_schedules(usage_count DESC);

-- Subscriptions
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_expires_at ON public.subscriptions(expires_at);

-- Call Usage
CREATE INDEX idx_call_usage_user_id ON public.call_usage(user_id);
CREATE INDEX idx_call_usage_created_at ON public.call_usage(created_at DESC);

-- Phone Verifications
CREATE INDEX idx_phone_verifications_user_id ON public.phone_verifications(user_id);
CREATE INDEX idx_phone_verifications_phone_number ON public.phone_verifications(phone_number);
CREATE INDEX idx_phone_verifications_expires_at ON public.phone_verifications(expires_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persona_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caller_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upcoming_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- Voices table is public (no RLS needed)
ALTER TABLE public.voices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Voices are viewable by everyone" ON public.voices FOR SELECT USING (true);

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Personas policies
CREATE POLICY "Users can view default personas" ON public.personas FOR SELECT USING (is_default = true);
CREATE POLICY "Users can view own personas" ON public.personas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own personas" ON public.personas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own personas" ON public.personas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own personas" ON public.personas FOR DELETE USING (auth.uid() = user_id AND is_default = false);

-- Persona configs policies
CREATE POLICY "Users can view persona configs" ON public.persona_configs FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own persona configs" ON public.persona_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own persona configs" ON public.persona_configs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own persona configs" ON public.persona_configs FOR DELETE USING (auth.uid() = user_id);

-- Caller IDs policies
CREATE POLICY "Users can view own caller IDs" ON public.caller_ids FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own caller IDs" ON public.caller_ids FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own caller IDs" ON public.caller_ids FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own caller IDs" ON public.caller_ids FOR DELETE USING (auth.uid() = user_id);

-- Upcoming calls policies
CREATE POLICY "Users can view own upcoming calls" ON public.upcoming_calls FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own upcoming calls" ON public.upcoming_calls FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own upcoming calls" ON public.upcoming_calls FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own upcoming calls" ON public.upcoming_calls FOR DELETE USING (auth.uid() = user_id);

-- Call history policies
CREATE POLICY "Users can view own call history" ON public.call_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own call history" ON public.call_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own call history" ON public.call_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own call history" ON public.call_history FOR DELETE USING (auth.uid() = user_id);

-- Quick schedules policies
CREATE POLICY "Users can view own quick schedules" ON public.quick_schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quick schedules" ON public.quick_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quick schedules" ON public.quick_schedules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quick schedules" ON public.quick_schedules FOR DELETE USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Call usage policies
CREATE POLICY "Users can view own call usage" ON public.call_usage FOR SELECT USING (auth.uid() = user_id);

-- Phone verifications policies
CREATE POLICY "Users can view own verifications" ON public.phone_verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own verifications" ON public.phone_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own verifications" ON public.phone_verifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own verifications" ON public.phone_verifications FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personas_updated_at BEFORE UPDATE ON public.personas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_persona_configs_updated_at BEFORE UPDATE ON public.persona_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_caller_ids_updated_at BEFORE UPDATE ON public.caller_ids
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_upcoming_calls_updated_at BEFORE UPDATE ON public.upcoming_calls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quick_schedules_updated_at BEFORE UPDATE ON public.quick_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);

  -- Create default subscription
  INSERT INTO public.subscriptions (user_id, tier, calls_remaining, calls_limit, texts_remaining, texts_limit)
  VALUES (NEW.id, 'free', 2, 2, 0, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to decrement call/text usage
CREATE OR REPLACE FUNCTION public.decrement_usage(
  p_user_id UUID,
  p_method_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_remaining INTEGER;
BEGIN
  IF p_method_type = 'call' THEN
    UPDATE public.subscriptions
    SET calls_remaining = calls_remaining - 1
    WHERE user_id = p_user_id AND calls_remaining > 0
    RETURNING calls_remaining INTO v_remaining;
  ELSIF p_method_type = 'text' THEN
    UPDATE public.subscriptions
    SET texts_remaining = texts_remaining - 1
    WHERE user_id = p_user_id AND texts_remaining > 0
    RETURNING texts_remaining INTO v_remaining;
  END IF;

  RETURN v_remaining IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default voices
INSERT INTO public.voices (id, name, category, gender, icon, description) VALUES
  ('emma', 'Emma', 'realistic', 'female', '👩', 'Professional & warm'),
  ('james', 'James', 'realistic', 'male', '👨', 'Clear & confident'),
  ('sophia', 'Sophia', 'character', NULL, '🌸', 'Friendly & approachable'),
  ('alex', 'Alex', 'character', NULL, '😎', 'Casual & cool'),
  ('morgan', 'Morgan', 'character', NULL, '🎩', 'Formal & sophisticated'),
  ('jordan', 'Jordan', 'character', NULL, '⚡', 'Energetic & dynamic');

-- Insert default personas (no user_id = global default)
INSERT INTO public.personas (id, user_id, name, icon, color, is_default) VALUES
  ('manager', NULL, 'Manager', '💼', 'bg-blue-500/10 text-blue-500', true),
  ('coordinator', NULL, 'Coordinator', '📋', 'bg-purple-500/10 text-purple-500', true),
  ('service', NULL, 'Service', '🔧', 'bg-orange-500/10 text-orange-500', true),
  ('friend', NULL, 'Friend', '💬', 'bg-green-500/10 text-green-500', true),
  ('mom', NULL, 'Mom', '👩', 'bg-pink-500/10 text-pink-500', true),
  ('doctor', NULL, 'Doctor', '⚕️', 'bg-red-500/10 text-red-500', true),
  ('boss', NULL, 'Boss', '👔', 'bg-gray-500/10 text-gray-500', true);

-- Insert default persona configs (no user_id = global default)
INSERT INTO public.persona_configs (persona_id, user_id, tone, background_sound, duration_seconds) VALUES
  ('manager', NULL, 'formal', 'office', 30),
  ('coordinator', NULL, 'casual', 'office', 30),
  ('service', NULL, 'friendly', 'none', 30),
  ('friend', NULL, 'casual', 'cafe', 30),
  ('mom', NULL, 'concerned', 'home', 30),
  ('doctor', NULL, 'formal', 'office', 30),
  ('boss', NULL, 'formal', 'office', 30);

-- ============================================================================
-- HELPFUL VIEWS (Optional)
-- ============================================================================

-- View for upcoming calls with related data
CREATE VIEW public.upcoming_calls_detailed AS
SELECT
  uc.*,
  p.name as persona_name,
  p.icon as persona_icon,
  v.name as voice_name,
  ci.name as caller_name,
  ci.phone_number as caller_number
FROM public.upcoming_calls uc
LEFT JOIN public.personas p ON uc.persona_id = p.id
LEFT JOIN public.voices v ON uc.voice_id = v.id
LEFT JOIN public.caller_ids ci ON uc.caller_id = ci.id;

-- View for call history with related data
CREATE VIEW public.call_history_detailed AS
SELECT
  ch.*,
  p.name as persona_name,
  p.icon as persona_icon,
  v.name as voice_name,
  ci.name as caller_name,
  ci.phone_number as caller_number
FROM public.call_history ch
LEFT JOIN public.personas p ON ch.persona_id = p.id
LEFT JOIN public.voices v ON ch.voice_id = v.id
LEFT JOIN public.caller_ids ci ON ch.caller_id = ci.id;

-- View for user subscription status
CREATE VIEW public.user_subscription_status AS
SELECT
  u.id as user_id,
  u.email,
  s.tier,
  s.calls_remaining,
  s.calls_limit,
  s.texts_remaining,
  s.texts_limit,
  s.expires_at,
  s.auto_renew,
  CASE
    WHEN s.expires_at IS NULL THEN true
    WHEN s.expires_at > NOW() THEN true
    ELSE false
  END as is_active
FROM public.users u
LEFT JOIN public.subscriptions s ON u.id = s.user_id;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant access to tables
GRANT SELECT ON public.voices TO anon, authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.personas TO authenticated;
GRANT ALL ON public.persona_configs TO authenticated;
GRANT ALL ON public.caller_ids TO authenticated;
GRANT ALL ON public.upcoming_calls TO authenticated;
GRANT ALL ON public.call_history TO authenticated;
GRANT ALL ON public.quick_schedules TO authenticated;
GRANT ALL ON public.subscriptions TO authenticated;
GRANT SELECT ON public.call_usage TO authenticated;
GRANT ALL ON public.phone_verifications TO authenticated;

-- Grant access to views
GRANT SELECT ON public.upcoming_calls_detailed TO authenticated;
GRANT SELECT ON public.call_history_detailed TO authenticated;
GRANT SELECT ON public.user_subscription_status TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.decrement_usage TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- You can now run this migration in your Supabase SQL Editor
-- All tables, relationships, indexes, RLS policies, and seed data are ready!
-- ============================================================================
