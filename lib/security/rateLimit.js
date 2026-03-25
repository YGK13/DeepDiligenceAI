// ============================================================================
// lib/security/rateLimit.js — In-Memory Rate Limiter for API Routes
// ============================================================================
// WHY: Without rate limiting, any user (or bot) can hammer our AI proxy routes
// with unlimited requests, burning through expensive API credits (Perplexity,
// Anthropic, OpenAI, Groq) and potentially causing service degradation.
//
// This implements a sliding-window rate limiter using an in-memory Map.
// It's perfect for Vercel serverless because:
//   - No external dependencies (Redis, Upstash, etc.)
//   - Works immediately with zero config
//   - Automatic cleanup prevents memory leaks
//   - Fast: O(1) lookups via Map
//
// TRADE-OFF: In-memory means limits reset on cold starts and aren't shared
// across serverless instances. For a DD tool with moderate traffic, this is
// fine. If you scale to hundreds of concurrent users, upgrade to Upstash Redis.
//
// USAGE:
//   import { rateLimitByApiRoute } from '@/lib/security/rateLimit';
//   const { success, remaining } = rateLimitByApiRoute(request);
//   if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
// ============================================================================

// ============ RATE LIMIT STORE ============
// Global Map that persists across requests within the same serverless instance.
// Keys are client identifiers (IP addresses), values are request tracking objects.
// We use a single shared Map for all rate limiter instances to simplify cleanup.
const rateLimitStore = new Map();

// ============ CLEANUP INTERVAL ============
// Expired entries accumulate over time. This interval sweeps the Map every 60s
// and removes entries whose window has passed. Without this, the Map would grow
// unbounded on long-running instances (e.g., local dev or persistent containers).
const CLEANUP_INTERVAL_MS = 60_000; // 60 seconds

let cleanupTimer = null;

function startCleanup() {
  // Only start ONE cleanup timer globally, even if rateLimit() is called many times
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      // If the entry's window has fully expired, remove it
      if (now > entry.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // IMPORTANT: unref() lets Node.js exit even if this timer is still running.
  // Without this, the process would hang in test environments and during graceful shutdown.
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

// ============ IP EXTRACTION HELPER ============
// In production on Vercel, the real client IP is in x-forwarded-for.
// In dev, it might be 127.0.0.1 or ::1. We normalize to ensure consistent keys.
function getClientIp(request) {
  // x-forwarded-for can contain multiple IPs: "client, proxy1, proxy2"
  // The FIRST one is the real client IP (set by Vercel's edge network)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // x-real-ip is another common header (nginx, some proxies)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Fallback for local development — all requests come from localhost
  return '127.0.0.1';
}

// ============ CORE RATE LIMIT FACTORY ============
// Creates a rate limiter function with the given configuration.
// Returns a function that takes a Request and returns { success, remaining, resetAt }.
//
// Parameters:
//   windowMs    — Time window in milliseconds (default: 60,000 = 1 minute)
//   maxRequests — Max requests allowed per window (default: 20)
//   keyGenerator — Function that extracts a unique key from the request (default: IP-based)
//   prefix      — String prefix for the Map key to namespace different limiters
function rateLimit(options = {}) {
  const {
    windowMs = 60_000,       // 1 minute default window
    maxRequests = 20,         // 20 requests per window by default
    keyGenerator = getClientIp, // IP-based by default
    prefix = 'rl',            // namespace prefix to avoid key collisions between limiters
  } = options;

  // Start the global cleanup timer on first use
  startCleanup();

  // Return the actual rate-check function
  return function checkRateLimit(request) {
    const now = Date.now();
    const clientKey = `${prefix}:${keyGenerator(request)}`;

    // Look up existing entry for this client
    let entry = rateLimitStore.get(clientKey);

    if (!entry || now > entry.resetAt) {
      // No entry or window expired — start a fresh window
      entry = {
        count: 1,
        resetAt: now + windowMs,
      };
      rateLimitStore.set(clientKey, entry);

      return {
        success: true,
        remaining: maxRequests - 1,
        resetAt: new Date(entry.resetAt),
      };
    }

    // Window is still active — increment the counter
    entry.count += 1;

    if (entry.count > maxRequests) {
      // OVER LIMIT — reject the request
      return {
        success: false,
        remaining: 0,
        resetAt: new Date(entry.resetAt),
      };
    }

    // Under limit — allow the request
    return {
      success: true,
      remaining: maxRequests - entry.count,
      resetAt: new Date(entry.resetAt),
    };
  };
}

// ============ PRE-CONFIGURED INSTANCES ============
// These are ready-to-use limiters with sensible defaults for different route types.

// General API routes: 20 requests per minute per IP
// Suitable for non-AI endpoints (settings, data fetching, etc.)
const rateLimitByIp = rateLimit({
  windowMs: 60_000,    // 1 minute
  maxRequests: 20,      // 20 req/min — generous for normal usage
  prefix: 'ip',
});

// AI/research routes: 10 requests per minute per IP
// Stricter because each request burns expensive AI API credits.
// 10 req/min is still generous for real DD research workflows
// (a human can't realistically analyze more than a few companies per minute)
// but blocks automated abuse effectively.
const rateLimitByApiRoute = rateLimit({
  windowMs: 60_000,    // 1 minute
  maxRequests: 10,      // 10 req/min — protects API credit spend
  prefix: 'ai',
});

// ============ EXPORTS ============
export { rateLimit, rateLimitByIp, rateLimitByApiRoute };
export default rateLimit;
