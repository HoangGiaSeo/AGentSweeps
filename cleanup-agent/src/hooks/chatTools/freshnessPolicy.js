/**
 * Freshness Policy — V1
 *
 * Pure functions that evaluate disk cache state and determine
 * whether to use cached data, fetch fresh, or fall back to stale.
 *
 * Source of truth for disk freshness logic.
 * All functions are pure and side-effect-free — fully unit-testable.
 *
 * Policy:
 *   - Cache age ≤ 60s  → use cached
 *   - Cache age > 60s or missing → fetch fresh
 *   - User says "hiện tại/bây giờ/lúc này" → always fetch fresh
 *   - Fresh fetch fail + cache ≤ 10m → stale-fallback with label
 *   - Fresh fetch fail + cache > 10m or no cache → no injection
 */
import { CACHE_TTL_MS, STALE_FALLBACK_TTL_MS } from "./toolRegistry";

/**
 * Evaluates disk cache state BEFORE attempting a fresh fetch.
 *
 * @param {{ data: any, capturedAt: number | null }} cache
 * @param {boolean} forceRefresh — from isForceRefresh()
 * @returns {{ decision: "use-cached"|"fetch-fresh", freshness: string, reason: string }}
 */
export function evaluateDiskCacheDecision(cache, forceRefresh) {
  if (forceRefresh) {
    return { decision: "fetch-fresh", freshness: "fresh", reason: "force-refresh-requested" };
  }

  const hasData =
    cache &&
    cache.data !== null &&
    cache.data !== undefined &&
    !(Array.isArray(cache.data) && cache.data.length === 0);

  if (!hasData || cache.capturedAt === null || cache.capturedAt === undefined) {
    return { decision: "fetch-fresh", freshness: "fresh", reason: "cache-empty-or-untimed" };
  }

  const age = Date.now() - cache.capturedAt;
  if (age <= CACHE_TTL_MS) {
    return { decision: "use-cached", freshness: "cached", reason: "cache-within-ttl" };
  }

  return { decision: "fetch-fresh", freshness: "fresh", reason: "cache-expired" };
}

/**
 * Evaluates fallback options AFTER a fresh fetch has failed.
 *
 * @param {{ data: any, capturedAt: number | null }} cache
 * @returns {{ decision: "use-stale"|"no-injection", freshness: string, reason: string }}
 */
export function evaluateFreshFetchFallback(cache) {
  const hasData =
    cache &&
    cache.data !== null &&
    cache.data !== undefined &&
    !(Array.isArray(cache.data) && cache.data.length === 0);

  if (!hasData || !cache.capturedAt) {
    return { decision: "no-injection", freshness: "none", reason: "no-usable-cache-after-fail" };
  }

  const age = Date.now() - cache.capturedAt;
  if (age <= STALE_FALLBACK_TTL_MS) {
    return {
      decision: "use-stale",
      freshness: "stale-fallback",
      reason: "fresh-fail-using-stale-within-window",
    };
  }

  return { decision: "no-injection", freshness: "none", reason: "stale-cache-too-old-after-fail" };
}
