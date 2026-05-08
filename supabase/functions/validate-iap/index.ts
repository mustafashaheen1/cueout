import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Must match IAP_PRODUCTS in src/lib/iap.js
const BILLING_CYCLES: Record<string, string> = {
  'com.cueout.ios.plus.monthly': 'monthly',
  'com.cueout.ios.plus.yearly':  'yearly',
};

const FREE_CALLS  = 2;
const PLUS_CALLS  = 20;
const PLUS_LIMITS = { texts_limit: 999999 };

// StoreKit 2 JWS transactions use base64url encoding.
// Decodes the payload section (part[1]) without verifying Apple's cert chain.
// Full cert verification can be added later once App Store Connect is set up.
function decodeJWSPayload(jws: string): Record<string, unknown> {
  const parts = jws.split('.');
  if (parts.length < 2) throw new Error('Invalid JWS format');
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return JSON.parse(atob(padded));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth check ────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { jwsRepresentation, isMock, intendedProductId } = await req.json();
    if (!jwsRepresentation) {
      return new Response(JSON.stringify({ error: 'jwsRepresentation is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Supabase clients ──────────────────────────────────────────────────────
    // Admin client — bypasses RLS to write subscription data
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // User client — verifies the caller's JWT
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Parse transaction ─────────────────────────────────────────────────────
    let productId: string;
    let expiresAtFromJWS: string | undefined; // only set when JWS belongs to the intended product
    let transactionId: string;
    let isCrossgrade = false; // true when sandbox returns old plan's JWS for a crossgrade

    if (isMock) {
      // Browser / dev mode — mock token format is "mock_jws_<productId>"
      productId     = jwsRepresentation.replace('mock_jws_', '');
      transactionId = `mock_${Date.now()}`;
    } else {
      // Real StoreKit 2 JWS transaction from Apple
      const payload = decodeJWSPayload(jwsRepresentation);
      // Apple's JWS payload uses camelCase — handle both productId and productID variants
      const jwsProductId = (payload.productId ?? (payload as Record<string, unknown>).productID) as string;
      transactionId = String(payload.transactionId ?? '');
      // In sandbox, crossgrades return the existing subscription's JWS instead of a new one.
      // Trust intendedProductId when provided — the JWS product/expiry belongs to the old plan.
      isCrossgrade = !!(intendedProductId && intendedProductId !== jwsProductId);
      productId    = intendedProductId ?? jwsProductId;
      // Only use JWS expiresDate when the JWS belongs to the intended product (not a crossgrade).
      if (payload.expiresDate && !isCrossgrade) {
        expiresAtFromJWS = new Date(payload.expiresDate as number).toISOString();
      }
      console.log('JWS productId:', jwsProductId, '| intendedProductId:', intendedProductId, '| isCrossgrade:', isCrossgrade);
    }

    const billingCycle = BILLING_CYCLES[productId] ?? 'monthly';
    console.log('billingCycle:', billingCycle);

    // ── Fetch existing subscription ───────────────────────────────────────────
    // Must happen before expiry calculation so we can base yearly start on
    // the current monthly end date for crossgrades.
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('tier, calls_limit, calls_remaining, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    const now = new Date();
    const existingExpiry = existing?.expires_at ? new Date(existing.expires_at as string) : null;
    const isLapsed = !existingExpiry || existingExpiry < now;

    // ── Compute expiry ────────────────────────────────────────────────────────
    let expiresAt: string;
    if (expiresAtFromJWS) {
      // Apple provided a real expiry in the JWS — use it as source of truth.
      expiresAt = expiresAtFromJWS;
    } else if (isCrossgrade && billingCycle === 'yearly' && existingExpiry && !isLapsed) {
      // Monthly → Yearly crossgrade: yearly period begins when the monthly period ends.
      // e.g. monthly ends Jun 4 → yearly ends Jun 4, 2027.
      expiresAt = new Date(existingExpiry.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      // New purchase, renewal after lapse, or mock — start from today.
      const fallbackDays = billingCycle === 'yearly' ? 365 : 30;
      expiresAt = new Date(Date.now() + fallbackDays * 24 * 60 * 60 * 1000).toISOString();
    }
    console.log('IAP grant:', { userId: user.id, billingCycle, isCrossgrade, existingExpiry, expiresAt });

    let newCallsLimit: number;
    let newCallsRemaining: number;

    if (!existing || existing.tier !== 'plus') {
      // First-time upgrade from free (or brand-new account)
      const currentLimit     = (existing?.calls_limit     as number) ?? FREE_CALLS;
      const currentRemaining = (existing?.calls_remaining as number) ?? FREE_CALLS;
      newCallsLimit     = currentLimit     + PLUS_CALLS;
      newCallsRemaining = currentRemaining + PLUS_CALLS;
    } else if (isLapsed) {
      // Subscription was expired — this is a true renewal → full reset
      newCallsLimit     = FREE_CALLS + PLUS_CALLS;
      newCallsRemaining = FREE_CALLS + PLUS_CALLS;
    } else {
      // Active Plus subscription being changed (crossgrade monthly→yearly or re-grant)
      // Keep the user's current remaining calls, just correct the limit if needed
      newCallsLimit     = Math.max((existing.calls_limit as number) ?? 0, FREE_CALLS + PLUS_CALLS);
      newCallsRemaining = (existing.calls_remaining as number) ?? 0;
    }

    // ── Update DB ─────────────────────────────────────────────────────────────
    const { error: upsertError } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id:              user.id,
        tier:                 'plus',
        billing_cycle:        billingCycle,
        calls_limit:          newCallsLimit,
        calls_remaining:      newCallsRemaining,
        texts_limit:          PLUS_LIMITS.texts_limit,
        texts_remaining:      PLUS_LIMITS.texts_limit,
        apple_transaction_id: transactionId,
        started_at:           new Date().toISOString(),
        expires_at:           expiresAt,
        auto_renew:           true,
      }, { onConflict: 'user_id' });

    if (upsertError) throw upsertError;

    // Keep users table in sync
    await supabaseAdmin
      .from('users')
      .update({ subscription_tier: 'plus' })
      .eq('id', user.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
