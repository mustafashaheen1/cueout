import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/supabase';

// ============================================================================
// SUBSCRIPTIONS API
// ============================================================================

/**
 * Get current user's subscription
 */
export const getSubscription = async () => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
  return data;
};

/**
 * Get subscription status with user info (using view)
 */
export const getSubscriptionStatus = async () => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('user_subscription_status')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

/**
 * Check if user can make a call/text
 */
export const canUseMethod = async (methodType) => {
  const subscription = await getSubscription();

  if (!subscription) return false;

  if (methodType === 'call') {
    return subscription.calls_remaining > 0;
  } else if (methodType === 'text') {
    return subscription.tier === 'plus' || subscription.texts_remaining > 0;
  } else if (methodType === 'email') {
    return true; // Email might be unlimited or have different limits
  }

  return false;
};

/**
 * Decrement usage (call or text)
 */
export const decrementUsage = async (methodType) => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .rpc('decrement_usage', {
      p_user_id: userId,
      p_method_type: methodType
    });

  if (error) throw error;
  return data;
};

/**
 * Update subscription tier
 */
export const updateSubscriptionTier = async (tier, billingCycle, stripeSubscriptionId = null) => {
  const userId = await getCurrentUserId();

  const limits = tier === 'plus'
    ? { calls_limit: 20, texts_limit: 999999 } // Unlimited texts for plus
    : { calls_limit: 2, texts_limit: 0 };

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      tier,
      billing_cycle: billingCycle,
      calls_limit: limits.calls_limit,
      calls_remaining: limits.calls_limit,
      texts_limit: limits.texts_limit,
      texts_remaining: limits.texts_limit,
      stripe_subscription_id: stripeSubscriptionId,
      started_at: new Date().toISOString(),
      expires_at: billingCycle === 'monthly'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      auto_renew: true
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;

  // Also update user table
  await supabase
    .from('users')
    .update({ subscription_tier: tier })
    .eq('id', userId);

  return data;
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async () => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      auto_renew: false
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Reset monthly usage (called by cron job)
 */
export const resetMonthlyUsage = async () => {
  const userId = await getCurrentUserId();

  const subscription = await getSubscription();

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      calls_remaining: subscription.calls_limit,
      texts_remaining: subscription.texts_limit
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Add top-up calls (for Plus users who run out)
 */
export const addTopUpCalls = async (amount) => {
  const userId = await getCurrentUserId();

  const subscription = await getSubscription();

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      calls_remaining: subscription.calls_remaining + amount
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};
