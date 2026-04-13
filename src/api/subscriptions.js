import { supabase } from '../lib/supabase';
import { supabaseQuery, withAuth } from '../lib/supabaseMiddleware';

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const getSubscription = () =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('subscriptions').select('*').eq('user_id', userId).single()
    ).catch((err) => {
      if (err.code === 'PGRST116') return null;
      throw err;
    })
  );

export const getSubscriptionStatus = () =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('user_subscription_status').select('*').eq('user_id', userId).single()
    ).catch((err) => {
      if (err.code === 'PGRST116') return null;
      throw err;
    })
  );

export const canUseMethod = async (methodType) => {
  const subscription = await getSubscription();
  if (!subscription) return false;
  if (methodType === 'call') return subscription.calls_remaining > 0;
  if (methodType === 'text') return subscription.tier === 'plus' || subscription.texts_remaining > 0;
  if (methodType === 'email') return true;
  return false;
};

export const decrementUsage = (methodType) =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.rpc('decrement_usage', { p_user_id: userId, p_method_type: methodType })
    )
  );

export const updateSubscriptionTier = (tier, billingCycle, stripeSubscriptionId = null) =>
  withAuth(async (userId) => {
    const limits = tier === 'plus'
      ? { calls_limit: 20, texts_limit: 999999 }
      : { calls_limit: 2, texts_limit: 0 };

    const data = await supabaseQuery(() =>
      supabase.from('subscriptions').update({
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
      }).eq('user_id', userId).select().single()
    );

    await supabaseQuery(() =>
      supabase.from('users').update({ subscription_tier: tier }).eq('id', userId)
    );

    return data;
  });

export const cancelSubscription = () =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('subscriptions').update({ auto_renew: false })
        .eq('user_id', userId).select().single()
    )
  );

export const resetMonthlyUsage = () =>
  withAuth(async (userId) => {
    const subscription = await getSubscription();
    return supabaseQuery(() =>
      supabase.from('subscriptions').update({
        calls_remaining: subscription.calls_limit,
        texts_remaining: subscription.texts_limit
      }).eq('user_id', userId).select().single()
    );
  });

export const addTopUpCalls = (amount) =>
  withAuth(async (userId) => {
    const subscription = await getSubscription();
    return supabaseQuery(() =>
      supabase.from('subscriptions').update({
        calls_remaining: subscription.calls_remaining + amount
      }).eq('user_id', userId).select().single()
    );
  });
