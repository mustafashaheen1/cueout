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

const PLUS_LIMITS = { calls_limit: 20, texts_limit: 999999 };

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

    const { jwsRepresentation, isMock } = await req.json();
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
    let expiresAt: string;
    let transactionId: string;

    if (isMock) {
      // Browser / dev mode — mock token format is "mock_jws_<productId>"
      productId  = jwsRepresentation.replace('mock_jws_', '');
      expiresAt  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      transactionId = `mock_${Date.now()}`;
    } else {
      // Real StoreKit 2 JWS transaction from Apple
      const payload = decodeJWSPayload(jwsRepresentation);
      productId  = payload.productId as string;
      // StoreKit 2 sends expiresDate as ms since epoch
      expiresAt  = payload.expiresDate
        ? new Date(payload.expiresDate as number).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      transactionId = String(payload.transactionId ?? '');
    }

    const billingCycle = BILLING_CYCLES[productId] ?? 'monthly';

    // ── Update DB ─────────────────────────────────────────────────────────────
    const { error: upsertError } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id:              user.id,
        tier:                 'plus',
        billing_cycle:        billingCycle,
        calls_limit:          PLUS_LIMITS.calls_limit,
        calls_remaining:      PLUS_LIMITS.calls_limit,
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
