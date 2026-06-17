// In-Memory Token Bucket Memory Matrix Cache
const limiterCache = new Map<string, { tokens: number; lastRefill: number }>();

interface RateLimiterOptions {
  maxTokens: number;     // Total bucket size capacity
  refillRate: number;    // Tokens refilled per second
}

export function isRateLimited(ip: string, options: RateLimiterOptions): boolean {
  const now = Date.now();
  const bucket = limiterCache.get(ip) || { tokens: options.maxTokens, lastRefill: now };

  // Calculate elapsed duration and compute token refill accrual
  const elapsedSeconds = (now - bucket.lastRefill) / 1000;
  const refilledTokens = Math.min(
    options.maxTokens,
    bucket.tokens + (elapsedSeconds * options.refillRate)
  );

  // Drop connection instantly if the token count is completely empty
  if (refilledTokens < 1) {
    limiterCache.set(ip, { tokens: refilledTokens, lastRefill: now });
    return true;
  }

  // Deduct token asset and commit state changes back to memory cache
  limiterCache.set(ip, { tokens: refilledTokens - 1, lastRefill: now });
  return false;
}

// Scheduled Maintenance Janitor: Prevent memory bloat by cleaning old IPs every 15 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const horizon = Date.now() - 15 * 60 * 1000;
    for (const [ip, data] of limiterCache.entries()) {
      if (data.lastRefill < horizon) limiterCache.delete(ip);
    }
  }, 15 * 60 * 1000);
}