/**
 * Supabase Middleware
 *
 * Handles: consistent error class, human-readable Postgres error codes,
 * automatic session refresh on 401, auth guard for protected operations.
 */

import { supabase, getCurrentUserId } from './supabase';

// ─── Error Class ─────────────────────────────────────────────────────────────

export class SupabaseError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name    = 'SupabaseError';
    this.code    = code;
    this.details = details;
  }
}

// ─── Human-Readable Error Messages ───────────────────────────────────────────

const ERROR_MESSAGES = {
  // Postgres constraint codes
  '23505': 'This record already exists.',
  '23503': 'A related record was not found.',
  '23502': 'A required field is missing.',
  '23514': 'The value provided is not allowed.',
  '42501': 'You do not have permission to perform this action.',
  // PostgREST codes
  'PGRST116': 'Record not found.',
  'PGRST204': 'No content returned.',
  'PGRST301': 'Your session has expired. Please sign in again.',
  // Auth codes
  'SESSION_EXPIRED': 'Your session has expired. Please sign in again.',
  'NOT_AUTHENTICATED': 'You must be signed in to perform this action.',
};

function transformError(error) {
  const message =
    ERROR_MESSAGES[error.code] ||
    error.message ||
    'An unexpected error occurred. Please try again.';
  return new SupabaseError(message, error.code, error.details ?? null);
}

function isSessionError(error) {
  return (
    error.status === 401 ||
    error.code === 'PGRST301' ||
    error.message?.includes('JWT') ||
    error.message?.includes('token is expired')
  );
}

// ─── Core Query Wrapper ───────────────────────────────────────────────────────

/**
 * Wrap any Supabase query function with:
 *  - Consistent error transformation
 *  - Automatic session refresh + single retry on 401
 *
 * Usage:
 *   const data = await supabaseQuery(() =>
 *     supabase.from('personas').select('*').eq('user_id', userId)
 *   );
 *
 * @param {() => Promise<{data, error}>} queryFn
 * @returns {Promise<any>} Resolved data
 * @throws {SupabaseError}
 */
export async function supabaseQuery(queryFn) {
  const { data, error } = await queryFn();

  if (!error) return data;

  // Session expired → refresh token and retry once
  if (isSessionError(error)) {
    const { error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError) {
      throw new SupabaseError(
        'Your session has expired. Please sign in again.',
        'SESSION_EXPIRED'
      );
    }

    // Retry after successful refresh
    const { data: retryData, error: retryError } = await queryFn();
    if (retryError) throw transformError(retryError);
    return retryData;
  }

  throw transformError(error);
}

// ─── Auth Guard ───────────────────────────────────────────────────────────────

/**
 * Ensure user is authenticated before running a database operation.
 * Passes the Supabase user ID to the callback.
 *
 * Usage:
 *   const data = await withAuth((userId) =>
 *     supabaseQuery(() => supabase.from('calls').select('*').eq('user_id', userId))
 *   );
 *
 * @param {(userId: string) => Promise<any>} fn
 * @returns {Promise<any>}
 * @throws {SupabaseError} if not authenticated
 */
export async function withAuth(fn) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new SupabaseError(
      'You must be signed in to perform this action.',
      'NOT_AUTHENTICATED'
    );
  }

  return fn(userId);
}
