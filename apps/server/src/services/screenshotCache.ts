// In-memory cache for instant screenshot preview (base64 URLs)
// Key: requestId, Value: { base64Url: string, storageId?: string, expiresAt: number }
const screenshotCache = new Map<string, { base64Url: string; storageId?: string; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of screenshotCache.entries()) {
    if (value.expiresAt < now) {
      screenshotCache.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Store a base64 screenshot URL in cache for instant preview
 */
export function setScreenshotCache(requestId: string, base64Url: string): void {
  screenshotCache.set(requestId, {
    base64Url,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

/**
 * Get a cached screenshot URL
 */
export function getScreenshotCache(requestId: string): { base64Url: string; storageId?: string; expiresAt: number } | undefined {
  const cached = screenshotCache.get(requestId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }
  // Remove expired entry
  if (cached) {
    screenshotCache.delete(requestId);
  }
  return undefined;
}

/**
 * Update cache with storageId when it becomes available
 */
export function updateScreenshotCacheStorageId(requestId: string, storageId: string): void {
  const cached = screenshotCache.get(requestId);
  if (cached) {
    cached.storageId = storageId;
  }
}

/**
 * Remove a cached screenshot (when storage URL is ready)
 */
export function deleteScreenshotCache(requestId: string): void {
  screenshotCache.delete(requestId);
}
