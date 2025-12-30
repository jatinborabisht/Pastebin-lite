/**
 * Time utilities with TEST_MODE support for deterministic testing
 */

/**
 * Get the current time, respecting TEST_MODE for deterministic testing
 * @param headers Request headers that may contain x-test-now-ms
 * @returns Current time as Date object
 */
export function getCurrentTime(headers: Headers): Date {
  if (process.env.TEST_MODE === '1') {
    const testNowMs = headers.get('x-test-now-ms');
    if (testNowMs) {
      return new Date(parseInt(testNowMs, 10));
    }
  }
  return new Date();
}

/**
 * Calculate expiration timestamp from TTL seconds
 * @param ttlSeconds Time-to-live in seconds
 * @param now Current time
 * @returns Expiration timestamp
 */
export function calculateExpiresAt(ttlSeconds: number, now: Date): Date {
  return new Date(now.getTime() + ttlSeconds * 1000);
}

/**
 * Check if a paste has expired based on its expiration timestamp
 * @param expiresAt Expiration timestamp (null if no expiry)
 * @param now Current time
 * @returns True if paste is expired, false otherwise
 */
export function isPasteExpired(expiresAt: Date | null, now: Date): boolean {
  if (!expiresAt) return false;
  return now >= expiresAt;
}
