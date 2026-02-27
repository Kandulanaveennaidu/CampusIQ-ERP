/**
 * In-memory rate limiter for API routes.
 * Uses a sliding window algorithm with automatic cleanup.
 *
 * Note: This works for single-instance deployments.
 * For multi-instance deployments, use Redis-backed rate limiting
 * by setting REDIS_URL environment variable.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const MAX_STORE_SIZE = 10_000; // Prevent memory leaks with cap
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 60 seconds
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of Array.from(store.entries())) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, 60_000);
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given identifier.
 * @param identifier - Unique key (e.g., IP address or IP + path)
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    // Evict oldest entries if store is too large
    if (store.size >= MAX_STORE_SIZE) {
      const firstKey = store.keys().next().value;
      if (firstKey) store.delete(firstKey);
    }
    // New window
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetAt: now + windowMs,
    };
  }

  if (entry.count >= limit) {
    return { success: false, limit, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    success: true,
    limit,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}
