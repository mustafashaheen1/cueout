import { supabase } from '../lib/supabase';
import { supabaseQuery } from '../lib/supabaseMiddleware';

// ─── Voices ───────────────────────────────────────────────────────────────────

export const getVoices = () =>
  supabaseQuery(() =>
    supabase.from('voices').select('*')
      .eq('is_available', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })
  );

export const getVoicesByCategory = (category) =>
  supabaseQuery(() =>
    supabase.from('voices').select('*')
      .eq('category', category)
      .eq('is_available', true)
      .order('name', { ascending: true })
  );

export const getRealisticVoices = () => getVoicesByCategory('realistic');

export const getCharacterVoices = () => getVoicesByCategory('character');

export const getVoice = (voiceId) =>
  supabaseQuery(() =>
    supabase.from('voices').select('*').eq('id', voiceId).single()
  );
