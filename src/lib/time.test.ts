import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getCurrentTime, calculateExpiresAt, isPasteExpired } from './time';

describe('Time Utilities', () => {
  const originalTestMode = process.env.TEST_MODE;

  afterEach(() => {
    process.env.TEST_MODE = originalTestMode;
  });

  describe('getCurrentTime', () => {
    it('should return real system time when TEST_MODE is not set', () => {
      delete process.env.TEST_MODE;
      const headers = new Headers();
      headers.set('x-test-now-ms', '1000000000000');

      const before = Date.now();
      const result = getCurrentTime(headers);
      const after = Date.now();

      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
    });

    it('should return real system time when TEST_MODE is not "1"', () => {
      process.env.TEST_MODE = '0';
      const headers = new Headers();
      headers.set('x-test-now-ms', '1000000000000');

      const before = Date.now();
      const result = getCurrentTime(headers);
      const after = Date.now();

      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
    });

    it('should return time from x-test-now-ms header when TEST_MODE is "1"', () => {
      process.env.TEST_MODE = '1';
      const headers = new Headers();
      const testTime = 1609459200000; // 2021-01-01 00:00:00 UTC
      headers.set('x-test-now-ms', testTime.toString());

      const result = getCurrentTime(headers);

      expect(result.getTime()).toBe(testTime);
    });

    it('should return real system time when TEST_MODE is "1" but header is missing', () => {
      process.env.TEST_MODE = '1';
      const headers = new Headers();

      const before = Date.now();
      const result = getCurrentTime(headers);
      const after = Date.now();

      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('calculateExpiresAt', () => {
    it('should calculate expiration time correctly for 60 seconds', () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const ttlSeconds = 60;

      const result = calculateExpiresAt(ttlSeconds, now);

      expect(result.toISOString()).toBe('2021-01-01T00:01:00.000Z');
    });

    it('should calculate expiration time correctly for 3600 seconds (1 hour)', () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const ttlSeconds = 3600;

      const result = calculateExpiresAt(ttlSeconds, now);

      expect(result.toISOString()).toBe('2021-01-01T01:00:00.000Z');
    });

    it('should calculate expiration time correctly for 1 second', () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const ttlSeconds = 1;

      const result = calculateExpiresAt(ttlSeconds, now);

      expect(result.toISOString()).toBe('2021-01-01T00:00:01.000Z');
    });

    it('should handle large TTL values', () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const ttlSeconds = 86400; // 24 hours

      const result = calculateExpiresAt(ttlSeconds, now);

      expect(result.toISOString()).toBe('2021-01-02T00:00:00.000Z');
    });
  });

  describe('isPasteExpired', () => {
    it('should return false when expiresAt is null', () => {
      const now = new Date('2021-01-01T00:00:00.000Z');

      const result = isPasteExpired(null, now);

      expect(result).toBe(false);
    });

    it('should return true when current time is after expiration', () => {
      const expiresAt = new Date('2021-01-01T00:00:00.000Z');
      const now = new Date('2021-01-01T00:00:01.000Z');

      const result = isPasteExpired(expiresAt, now);

      expect(result).toBe(true);
    });

    it('should return false when current time is before expiration', () => {
      const expiresAt = new Date('2021-01-01T00:00:01.000Z');
      const now = new Date('2021-01-01T00:00:00.000Z');

      const result = isPasteExpired(expiresAt, now);

      expect(result).toBe(false);
    });

    it('should return true when current time equals expiration time', () => {
      const expiresAt = new Date('2021-01-01T00:00:00.000Z');
      const now = new Date('2021-01-01T00:00:00.000Z');

      const result = isPasteExpired(expiresAt, now);

      expect(result).toBe(true);
    });

    it('should return true when current time is far past expiration', () => {
      const expiresAt = new Date('2021-01-01T00:00:00.000Z');
      const now = new Date('2021-01-02T00:00:00.000Z');

      const result = isPasteExpired(expiresAt, now);

      expect(result).toBe(true);
    });
  });
});
