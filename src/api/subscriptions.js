import { supabase } from '../lib/supabase';
import { supabaseQuery, withAuth } from '../lib/supabaseMiddleware';
import { getActiveSubscription as getActiveIAPSubscription, getBillingCycle } from '../lib/iap';

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

// Used internally and by the validate-iap Edge Function result.
// Direct callers (Paywall) should use grantIAPSubscription() instead.
export const updateSubscriptionTier = (tier, billingCycle, appleTransactionId = null) =>
  withAuth(async (userId) => {
    const limits = tier === 'plus'
      ? { calls_limit: 20, texts_limit: 999999 }
      : { calls_limit: 2, texts_limit: 0 };

    const data = await supabaseQuery(() =>
      supabase.from('subscriptions').upsert({
        user_id: userId,
        tier,
        billing_cycle: billingCycle,
        calls_limit: limits.calls_limit,
        calls_remaining: limits.calls_limit,
        texts_limit: limits.texts_limit,
        texts_remaining: limits.texts_limit,
        apple_transaction_id: appleTransactionId,
        started_at: new Date().toISOString(),
        expires_at: billingCycle === 'monthly'
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        auto_renew: true
      }, { onConflict: 'user_id' }).select().single()
    );

    await supabaseQuery(() =>
      supabase.from('users').update({ subscription_tier: tier }).eq('id', userId)
    );

    return data;
  });

// ─── IAP Purchase Grant ────────────────────────────────────────────────────────
// Called after a successful StoreKit purchase. Sends the JWS transaction to the
// Edge Function which validates it with Apple and writes the subscription to DB.
export const grantIAPSubscription = async (jwsRepresentation, isMock = false) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-iap`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ jwsRepresentation, isMock }),
    }
  );

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Failed to validate purchase');
  return result;
};

// ─── Sync IAP on App Launch ───────────────────────────────────────────────────
// Checks StoreKit for an active subscription and syncs it to DB if needed.
// Call this on app mount to catch renewals that happened while app was closed.
export const syncIAPOnLaunch = async (currentSubscription) => {
  try {
    const active = await getActiveIAPSubscription();
    if (!active?.jwsRepresentation) return false; // no active IAP

    // If DB already shows plus and not expired, no sync needed
    const alreadySynced =
      currentSubscription?.tier === 'plus' &&
      currentSubscription?.expires_at &&
      new Date(currentSubscription.expires_at) > new Date();

    if (alreadySynced) return false;

    // DB is out of sync — re-grant from the active StoreKit transaction
    await grantIAPSubscription(active.jwsRepresentation, false);
    return true; // synced
  } catch {
    return false;
  }
};

// ─── Cancel Subscription ──────────────────────────────────────────────────────
// Apple owns cancellation — users must cancel via iOS Settings.
// This function opens the Apple subscription management page.
export const cancelSubscription = () => {
  window.open('https://apps.apple.com/account/subscriptions', '_blank');
};

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
