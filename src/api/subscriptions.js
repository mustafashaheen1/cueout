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

const FREE_CALLS = 2;
const PLUS_CALLS = 20;

// Used internally and by the validate-iap Edge Function result.
// Direct callers (Paywall) should use grantIAPSubscription() instead.
export const updateSubscriptionTier = (tier, billingCycle, appleTransactionId = null) =>
  withAuth(async (userId) => {
    let calls_limit, calls_remaining, texts_limit, texts_remaining;

    if (tier === 'plus') {
      texts_limit     = 999999;
      texts_remaining = 999999;
      // Fetch current subscription to calculate correct call counts
      const existing = await getSubscription().catch(() => null);
      if (!existing || existing.tier !== 'plus') {
        // First-time upgrade from free — add PLUS_CALLS on top of what user has
        const currentLimit     = existing?.calls_limit     ?? FREE_CALLS;
        const currentRemaining = existing?.calls_remaining ?? FREE_CALLS;
        calls_limit     = currentLimit     + PLUS_CALLS;
        calls_remaining = currentRemaining + PLUS_CALLS;
      } else if (existing.billing_cycle === billingCycle) {
        // Same billing cycle renewal — full reset to combined pool
        calls_limit     = FREE_CALLS + PLUS_CALLS;
        calls_remaining = FREE_CALLS + PLUS_CALLS;
      } else {
        // Billing cycle crossgrade (monthly→yearly) — keep current calls, correct limit
        calls_limit     = Math.max(existing.calls_limit ?? 0, FREE_CALLS + PLUS_CALLS);
        calls_remaining = existing.calls_remaining ?? 0;
      }
    } else {
      // Downgrade to free
      calls_limit     = FREE_CALLS;
      calls_remaining = FREE_CALLS;
      texts_limit     = 0;
      texts_remaining = 0;
    }

    const data = await supabaseQuery(() =>
      supabase.from('subscriptions').upsert({
        user_id: userId,
        tier,
        billing_cycle: billingCycle,
        calls_limit,
        calls_remaining,
        texts_limit,
        texts_remaining,
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
export const grantIAPSubscription = async (jwsRepresentation, isMock = false, intendedProductId = null) => {
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
      body: JSON.stringify({ jwsRepresentation, isMock, intendedProductId }),
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

    // Only auto-sync for existing Plus subscribers whose DB record is out of date.
    // Free users and brand-new accounts must purchase explicitly — never auto-grant.
    // This prevents a device's cached sandbox/production StoreKit subscription
    // from bleeding into a different Supabase account on the same device.
    if (!currentSubscription || currentSubscription.tier !== 'plus') return false;

    // If DB already shows plus and not expired, no sync needed
    const alreadySynced =
      currentSubscription?.tier === 'plus' &&
      currentSubscription?.expires_at &&
      new Date(currentSubscription.expires_at) > new Date();

    if (alreadySynced) return false;

    // Guard: only re-grant if the StoreKit transactionId matches what is stored
    // in the DB for this user. This prevents a cached sandbox transaction on the
    // device from being granted to a different Supabase account (e.g. new signup
    // on the same test device).
    const deviceTransactionId = String(active.transactionId ?? '');
    const dbTransactionId = String(currentSubscription?.apple_transaction_id ?? '');

    // If the DB has a transaction ID and it doesn't match the device, skip.
    // Allow grant when DB has no transaction ID (fresh account or first-time sync).
    if (dbTransactionId && deviceTransactionId && dbTransactionId !== deviceTransactionId) {
      return false;
    }

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
