import { Capacitor, registerPlugin } from '@capacitor/core';

// Native plugin bridge — auto-discovered from AppleAuthPlugin.swift/.m in the iOS target
const AppleAuthBridge = registerPlugin('AppleAuth');

/**
 * Triggers the native Sign in with Apple sheet (iOS only).
 * Returns { identityToken, nonce, user, fullName?, email? }
 * Rejects with 'USER_CANCELLED' if user dismisses.
 */
export const signInWithAppleNative = async () => {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('NATIVE_ONLY');
  }
  return AppleAuthBridge.signIn();
};
