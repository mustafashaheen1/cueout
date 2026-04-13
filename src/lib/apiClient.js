/**
 * Luron API Client Middleware
 *
 * Handles: auth header injection, retry with exponential backoff,
 * request timeout, consistent error class, dev logging.
 */

const BASE_URL = import.meta.env.VITE_LURON_BASE_URL;
const API_KEY  = import.meta.env.VITE_LURON_API_KEY;

const TIMEOUT_MS    = 15000; // 15 seconds per attempt
const MAX_RETRIES   = 3;
const RETRY_DELAY_MS = 500; // 500ms → 1000ms → 2000ms (exponential)

// Retry on server errors (5xx) and rate limiting (429).
// Never retry on client errors (4xx) — bad input won't fix itself.
const isRetryable = (status) => status === 429 || status >= 500;

// ─── Error Class ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name   = 'ApiError';
    this.status = status; // 0 = network/timeout/config error; 4xx/5xx = HTTP error
    this.data   = data;
  }
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseBody(options) {
  if (!options.body) return undefined;
  return typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
}

// ─── Core Request Function ───────────────────────────────────────────────────

/**
 * Make an authenticated request to the Luron API.
 *
 * @param {string} endpoint  - Path to append to base URL, e.g. '/schedule'
 * @param {RequestInit} options - Standard fetch options (method, body, headers…)
 * @returns {Promise<any>} Parsed JSON response body
 * @throws {ApiError}
 */
export async function luronRequest(endpoint, options = {}) {
  // ── Config guards ──────────────────────────────────────────────────────────
  if (!BASE_URL) {
    throw new ApiError(
      'Luron API URL is not configured. Add VITE_LURON_BASE_URL to your .env file.',
      0
    );
  }
  if (!API_KEY) {
    throw new ApiError(
      'Luron API key is not configured. Add VITE_LURON_API_KEY to your .env file.',
      0
    );
  }

  const url    = `${BASE_URL}${endpoint}`;
  const method = options.method?.toUpperCase() || 'GET';
  const body   = parseBody(options);

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    ...options.headers,
  };

  if (import.meta.env.DEV) {
    console.log(`[Luron] → ${method} ${endpoint}`);
    if (body) console.log('[Luron] body:', JSON.parse(body));
  }

  let lastError;

  // ── Retry loop ─────────────────────────────────────────────────────────────
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        method,
        body,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response — gracefully handle non-JSON
      let data;
      const ct = response.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        data = await response.json();
      } else {
        data = { message: await response.text() };
      }

      if (import.meta.env.DEV) {
        console.log(`[Luron] ← ${response.status} ${endpoint}`, data);
      }

      if (response.ok) return data;

      // Non-retryable client error → throw immediately
      if (!isRetryable(response.status)) {
        const message = data?.message || data?.error || `Request failed (${response.status})`;
        throw new ApiError(message, response.status, data);
      }

      // Retryable server/rate-limit error → store and loop
      lastError = new ApiError(
        data?.message || `Server error (${response.status})`,
        response.status,
        data
      );

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) throw error; // non-retryable — bail out

      if (error.name === 'AbortError') {
        lastError = new ApiError('Request timed out. Please try again.', 0);
      } else if (error instanceof TypeError || error.message === 'Failed to fetch') {
        lastError = new ApiError(
          'No internet connection. Please check your network and try again.',
          0
        );
      } else {
        throw error; // unexpected — rethrow as-is
      }
    }

    // Exponential backoff before next attempt: 500 → 1000 → 2000 ms
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      if (import.meta.env.DEV) {
        console.warn(`[Luron] Retry ${attempt}/${MAX_RETRIES - 1} in ${delay}ms…`);
      }
      await sleep(delay);
    }
  }

  throw lastError;
}

// ─── Convenience Methods ─────────────────────────────────────────────────────

export const luronGet  = (endpoint, options = {}) =>
  luronRequest(endpoint, { ...options, method: 'GET' });

export const luronPost = (endpoint, body, options = {}) =>
  luronRequest(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
