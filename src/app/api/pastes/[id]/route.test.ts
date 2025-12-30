import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { prisma } from '@/lib/db';
import { createPaste } from '@/lib/paste-service';

// Helper to create a mock NextRequest for GET
function createGetRequest(id: string, headers: Record<string, string> = {}) {
  const url = `http://localhost:3000/api/pastes/${id}`;
  return new NextRequest(url, {
    method: 'GET',
    headers: {
      host: 'localhost:3000',
      ...headers,
    },
  });
}

// Helper to call GET with params
async function callGet(id: string, headers: Record<string, string> = {}) {
  const request = createGetRequest(id, headers);
  return GET(request, { params: Promise.resolve({ id }) });
}

describe('GET /api/pastes/[id]', () => {
  beforeEach(async () => {
    await prisma.paste.deleteMany();
  });

  afterEach(async () => {
    await prisma.paste.deleteMany();
  });

  describe('successful fetch', () => {
    it('should return 200 with correct data', async () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello, world!' },
        now,
        'http://localhost:3000'
      );

      const response = await callGet(id);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content).toBe('Hello, world!');
      expect(data.remaining_views).toBeNull();
      expect(data.expires_at).toBeNull();
    });

    it('should increment view count on each fetch', async () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello' },
        now,
        'http://localhost:3000'
      );

      await callGet(id);
      await callGet(id);
      await callGet(id);

      const paste = await prisma.paste.findUnique({ where: { id } });
      expect(paste?.viewCount).toBe(3);
    });
  });

  describe('remaining_views', () => {
    it('should decrement remaining_views correctly', async () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello', max_views: 5 },
        now,
        'http://localhost:3000'
      );

      const response1 = await callGet(id);
      const data1 = await response1.json();
      expect(data1.remaining_views).toBe(4);

      const response2 = await callGet(id);
      const data2 = await response2.json();
      expect(data2.remaining_views).toBe(3);

      const response3 = await callGet(id);
      const data3 = await response3.json();
      expect(data3.remaining_views).toBe(2);
    });

    it('should return remaining_views as null for unlimited pastes', async () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello' },
        now,
        'http://localhost:3000'
      );

      const response = await callGet(id);
      const data = await response.json();

      expect(data.remaining_views).toBeNull();
    });
  });

  describe('expires_at', () => {
    it('should return expires_at as null for pastes without TTL', async () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello' },
        now,
        'http://localhost:3000'
      );

      const response = await callGet(id);
      const data = await response.json();

      expect(data.expires_at).toBeNull();
    });

    it('should return expires_at as ISO 8601 string for pastes with TTL', async () => {
      const createTime = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello', ttl_seconds: 3600 },
        createTime,
        'http://localhost:3000'
      );

      // Verify the paste was created with correct expiresAt in DB
      const pasteInDb = await prisma.paste.findUnique({ where: { id } });
      expect(pasteInDb?.expiresAt?.toISOString()).toBe('2021-01-01T01:00:00.000Z');

      // Use TEST_MODE to fetch with a controlled time (before expiry)
      const originalTestMode = process.env.TEST_MODE;
      process.env.TEST_MODE = '1';

      const fetchTime = new Date('2021-01-01T00:30:00.000Z').getTime();
      const response = await callGet(id, { 'x-test-now-ms': fetchTime.toString() });
      const data = await response.json();

      process.env.TEST_MODE = originalTestMode;

      // The expires_at should be 1 hour after creation time
      expect(response.status).toBe(200);
      expect(data.expires_at).toBe('2021-01-01T01:00:00.000Z');
    });
  });

  describe('404 errors', () => {
    it('should return 404 for non-existent paste', async () => {
      const response = await callGet('non-existent-id');

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Paste not found');
    });

    it('should return 404 for expired paste', async () => {
      const createTime = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello', ttl_seconds: 60 },
        createTime,
        'http://localhost:3000'
      );

      // Set TEST_MODE and fetch after expiry time
      const originalTestMode = process.env.TEST_MODE;
      process.env.TEST_MODE = '1';

      const fetchTime = new Date('2021-01-01T00:02:00.000Z').getTime();
      const response = await callGet(id, { 'x-test-now-ms': fetchTime.toString() });

      process.env.TEST_MODE = originalTestMode;

      expect(response.status).toBe(404);
    });

    it('should return 404 for paste at maxViews limit', async () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello', max_views: 2 },
        now,
        'http://localhost:3000'
      );

      // First two fetches should succeed
      const response1 = await callGet(id);
      expect(response1.status).toBe(200);

      const response2 = await callGet(id);
      expect(response2.status).toBe(200);

      // Third fetch should fail with 404
      const response3 = await callGet(id);
      expect(response3.status).toBe(404);
    });
  });

  describe('concurrent access', () => {
    it('should not exceed maxViews with concurrent requests', async () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello', max_views: 3 },
        now,
        'http://localhost:3000'
      );

      // Fire 5 concurrent requests
      const responses = await Promise.all([
        callGet(id),
        callGet(id),
        callGet(id),
        callGet(id),
        callGet(id),
      ]);

      // Only 3 should succeed (status 200)
      const successCount = responses.filter((r) => r.status === 200).length;
      expect(successCount).toBe(3);

      // Verify view count doesn't exceed maxViews
      const paste = await prisma.paste.findUnique({ where: { id } });
      expect(paste?.viewCount).toBe(3);
    });
  });

  describe('TEST_MODE support', () => {
    it('should use x-test-now-ms header when TEST_MODE is enabled', async () => {
      const createTime = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello', ttl_seconds: 60 },
        createTime,
        'http://localhost:3000'
      );

      const originalTestMode = process.env.TEST_MODE;
      process.env.TEST_MODE = '1';

      // Fetch at a time before expiry - should succeed
      const beforeExpiry = new Date('2021-01-01T00:00:30.000Z').getTime();
      const response1 = await callGet(id, { 'x-test-now-ms': beforeExpiry.toString() });
      expect(response1.status).toBe(200);

      // Fetch at a time after expiry - should fail
      const afterExpiry = new Date('2021-01-01T00:02:00.000Z').getTime();
      const response2 = await callGet(id, { 'x-test-now-ms': afterExpiry.toString() });
      expect(response2.status).toBe(404);

      process.env.TEST_MODE = originalTestMode;
    });
  });
});

