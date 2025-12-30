import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db';

// Helper to create a mock NextRequest
function createRequest(body: unknown, headers: Record<string, string> = {}) {
  const url = 'http://localhost:3000/api/pastes';
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      host: 'localhost:3000',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/pastes', () => {
  beforeEach(async () => {
    await prisma.paste.deleteMany();
  });

  afterEach(async () => {
    await prisma.paste.deleteMany();
  });

  describe('valid paste creation', () => {
    it('should return 201 status for valid paste', async () => {
      const request = createRequest({ content: 'Hello, world!' });
      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('should return response with id and url', async () => {
      const request = createRequest({ content: 'Hello, world!' });
      const response = await POST(request);
      const data = await response.json();

      expect(data.id).toBeDefined();
      expect(typeof data.id).toBe('string');
      expect(data.id.length).toBeGreaterThan(0);
      expect(data.url).toBeDefined();
      expect(data.url).toContain(`/p/${data.id}`);
    });

    it('should create paste in database', async () => {
      const request = createRequest({ content: 'Test content' });
      const response = await POST(request);
      const data = await response.json();

      const paste = await prisma.paste.findUnique({ where: { id: data.id } });
      expect(paste).not.toBeNull();
      expect(paste?.content).toBe('Test content');
    });
  });

  describe('invalid content', () => {
    it('should return 400 for missing content', async () => {
      const request = createRequest({});
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContainEqual(
        expect.objectContaining({ field: 'content' })
      );
    });

    it('should return 400 for empty content', async () => {
      const request = createRequest({ content: '' });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContainEqual(
        expect.objectContaining({ field: 'content', message: 'content cannot be empty' })
      );
    });

    it('should return 400 for non-string content', async () => {
      const request = createRequest({ content: 123 });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
    });
  });

  describe('invalid ttl_seconds', () => {
    it('should return 400 for ttl_seconds = 0', async () => {
      const request = createRequest({ content: 'Hello', ttl_seconds: 0 });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.details).toContainEqual(
        expect.objectContaining({ field: 'ttl_seconds' })
      );
    });

    it('should return 400 for negative ttl_seconds', async () => {
      const request = createRequest({ content: 'Hello', ttl_seconds: -1 });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for non-integer ttl_seconds', async () => {
      const request = createRequest({ content: 'Hello', ttl_seconds: 60.5 });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for string ttl_seconds', async () => {
      const request = createRequest({ content: 'Hello', ttl_seconds: '60' });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('invalid max_views', () => {
    it('should return 400 for max_views = 0', async () => {
      const request = createRequest({ content: 'Hello', max_views: 0 });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.details).toContainEqual(
        expect.objectContaining({ field: 'max_views' })
      );
    });

    it('should return 400 for negative max_views', async () => {
      const request = createRequest({ content: 'Hello', max_views: -5 });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for non-integer max_views', async () => {
      const request = createRequest({ content: 'Hello', max_views: 5.5 });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for string max_views', async () => {
      const request = createRequest({ content: 'Hello', max_views: '10' });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('paste with TTL', () => {
    it('should store correct expiresAt for paste with TTL', async () => {
      const testTime = new Date('2021-01-01T00:00:00.000Z').getTime();
      const request = createRequest(
        { content: 'Hello', ttl_seconds: 3600 },
        { 'x-test-now-ms': testTime.toString() }
      );

      // Set TEST_MODE for this test
      const originalTestMode = process.env.TEST_MODE;
      process.env.TEST_MODE = '1';

      const response = await POST(request);
      const data = await response.json();

      process.env.TEST_MODE = originalTestMode;

      expect(response.status).toBe(201);

      const paste = await prisma.paste.findUnique({ where: { id: data.id } });
      expect(paste?.expiresAt?.toISOString()).toBe('2021-01-01T01:00:00.000Z');
    });

    it('should store null expiresAt for paste without TTL', async () => {
      const request = createRequest({ content: 'Hello' });
      const response = await POST(request);
      const data = await response.json();

      const paste = await prisma.paste.findUnique({ where: { id: data.id } });
      expect(paste?.expiresAt).toBeNull();
    });
  });

  describe('paste with maxViews', () => {
    it('should store correct maxViews limit', async () => {
      const request = createRequest({ content: 'Hello', max_views: 5 });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);

      const paste = await prisma.paste.findUnique({ where: { id: data.id } });
      expect(paste?.maxViews).toBe(5);
    });

    it('should store null maxViews for unlimited paste', async () => {
      const request = createRequest({ content: 'Hello' });
      const response = await POST(request);
      const data = await response.json();

      const paste = await prisma.paste.findUnique({ where: { id: data.id } });
      expect(paste?.maxViews).toBeNull();
    });
  });

  describe('invalid JSON', () => {
    it('should return 400 for invalid JSON body', async () => {
      const url = 'http://localhost:3000/api/pastes';
      const request = new NextRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          host: 'localhost:3000',
        },
        body: 'not valid json',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid JSON body');
    });
  });
});

