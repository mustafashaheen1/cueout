// ============================================================================
// API INDEX - Central export for all API functions
// ============================================================================

// Re-export all API functions
export * from './auth';
export * from './personas';
export * from './calls';
export * from './callerIds';
export * from './quickSchedules';
export * from './subscriptions';
export * from './voices';

// Also export supabase client for direct use if needed
export { supabase, getCurrentUser, getCurrentUserId, isAuthenticated } from '../lib/supabase';
