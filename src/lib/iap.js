import { Capacitor, registerPlugin } from '@capacitor/core';

// Native plugin bridge — auto-discovered from IAPPlugin.swift/.m in the iOS target
const IAPBridge = registerPlugin('IAP');

// ─── Product IDs ──────────────────────────────────────────────────────────────
// These must match exactly what you create in App Store Connect.
// Update these once your products are set up.
export const IAP_PRODUCTS = {
  PLUS_MONTHLY: 'com.cueout.ios.plus.monthly',
  PLUS_YEARLY:  'com.cueout.ios.plus.yearly',
};

// Map product ID → billing cycle string used in DB
export const getBillingCycle = (productId) =>
  productId === IAP_PRODUCTS.PLUS_YEARLY ? 'yearly' : 'monthly';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isNative = () => Capacitor.isNativePlatform();

// ─── Purchase ─────────────────────────────────────────────────────────────────
// Triggers the native App Store payment sheet.
// Resolves with { jwsRepresentation, productId } on success.
// Rejects with code 'USER_CANCELLED' if user dismissed — caller should handle silently.
export const purchaseProduct = async (productId) => {
  if (!isNative()) {
    // Browser/dev mock — simulates a successful purchase
    return { jwsRepresentation: `mock_jws_${productId}`, productId, isMock: true };
  }
  return IAPBridge.purchaseProduct({ productId });
};

// ─── Restore ──────────────────────────────────────────────────────────────────
// Restores any previously purchased subscriptions (required by App Store guidelines).
// Resolves with { transactions: [{ productId, jwsRepresentation }] }
export const restorePurchases = async () => {
  if (!isNative()) return { transactions: [] };
  try {
    return await IAPBridge.restorePurchases();
  } catch {
    return { transactions: [] };
  }
};

// ─── Check Entitlement ────────────────────────────────────────────────────────
// Checks StoreKit for any active (non-expired, non-revoked) subscription.
// Called on app launch to sync local state with Apple's source of truth.
// Returns { productId, jwsRepresentation, expirationDate } or null.
export const getActiveSubscription = async () => {
  if (!isNative()) return null;
  try {
    const result = await IAPBridge.getActiveSubscription();
    // Plugin returns empty object {} when no active subscription
    if (!result?.productId) return null;
    return result;
  } catch {
    return null;
  }
};
