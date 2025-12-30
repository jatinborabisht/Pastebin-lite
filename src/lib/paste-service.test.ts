import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from './db';
import { createPaste, fetchPaste, getPasteContent } from './paste-service';

describe('Paste Service', () => {
  // Clean up database before and after each test
  beforeEach(async () => {
    await prisma.paste.deleteMany();
  });

  afterEach(async () => {
    await prisma.paste.deleteMany();
  });

  describe('createPaste', () => {
    it('should create a paste and return id and url', async () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const result = await createPaste(
        { content: 'Hello, world!' },
        now,
        'http://localhost:3000'
      );

      expect(result.id).toBeDefined();
      expect(result.id.length).toBeGreaterThan(0);
      expect(result.url).toBe(`http://localhost:3000/p/${result.id}`);

      // Verify paste was created in database
      const paste = await prisma.paste.findUnique({ where: { id: result.id } });
      expect(paste).not.toBeNull();
      expect(paste?.content).toBe('Hello, world!');
      expect(paste?.viewCount).toBe(0);
      expect(paste?.expiresAt).toBeNull();
      expect(paste?.maxViews).toBeNull();
    });

    it('should create a paste with ttl_seconds', async () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const result = await createPaste(
        { content: 'Hello', ttl_seconds: 3600 },
        now,
        'http://localhost:3000'
      );

      const paste = await prisma.paste.findUnique({ where: { id: result.id } });
      expect(paste?.expiresAt?.toISOString()).toBe('2021-01-01T01:00:00.000Z');
    });

    it('should create a paste with max_views', async () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const result = await createPaste(
        { content: 'Hello', max_views: 5 },
        now,
        'http://localhost:3000'
      );

      const paste = await prisma.paste.findUnique({ where: { id: result.id } });
      expect(paste?.maxViews).toBe(5);
    });

    it('should create a paste with both ttl_seconds and max_views', async () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const result = await createPaste(
        { content: 'Hello', ttl_seconds: 60, max_views: 10 },
        now,
        'http://localhost:3000'
      );

      const paste = await prisma.paste.findUnique({ where: { id: result.id } });
      expect(paste?.expiresAt?.toISOString()).toBe('2021-01-01T00:01:00.000Z');
      expect(paste?.maxViews).toBe(10);
    });

    it('should generate unique IDs for each paste', async () => {
      const now = new Date();
      const result1 = await createPaste(
        { content: 'Paste 1' },
        now,
        'http://localhost:3000'
      );
      const result2 = await createPaste(
        { content: 'Paste 2' },
        now,
        'http://localhost:3000'
      );

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('fetchPaste', () => {
    it('should fetch a paste and increment view count', async () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello, world!' },
        now,
        'http://localhost:3000'
      );

      const result = await fetchPaste(id, now);

      expect(result).not.toBeNull();
      expect(result?.content).toBe('Hello, world!');
      expect(result?.remaining_views).toBeNull();
      expect(result?.expires_at).toBeNull();

      // Verify view count was incremented
      const paste = await prisma.paste.findUnique({ where: { id } });
      expect(paste?.viewCount).toBe(1);
    });

    it('should increment view count on each fetch', async () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello' },
        now,
        'http://localhost:3000'
      );

      await fetchPaste(id, now);
      await fetchPaste(id, now);
      await fetchPaste(id, now);

      const paste = await prisma.paste.findUnique({ where: { id } });
      expect(paste?.viewCount).toBe(3);
    });

    it('should return null for non-existent paste', async () => {
      const now = new Date();
      const result = await fetchPaste('non-existent-id', now);
      expect(result).toBeNull();
    });

    it('should return null for expired paste', async () => {
      const createTime = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello', ttl_seconds: 60 },
        createTime,
        'http://localhost:3000'
      );

      // Fetch after expiry time
      const fetchTime = new Date('2021-01-01T00:02:00.000Z');
      const result = await fetchPaste(id, fetchTime);

      expect(result).toBeNull();
    });

    it('should return paste when not yet expired', async () => {
      const createTime = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello', ttl_seconds: 60 },
        createTime,
        'http://localhost:3000'
      );

      // Fetch before expiry time
      const fetchTime = new Date('2021-01-01T00:00:30.000Z');
      const result = await fetchPaste(id, fetchTime);

      expect(result).not.toBeNull();
      expect(result?.content).toBe('Hello');
      expect(result?.expires_at).toBe('2021-01-01T00:01:00.000Z');
    });

    it('should return null when maxViews is reached', async () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello', max_views: 2 },
        now,
        'http://localhost:3000'
      );

      // First two fetches should succeed
      const result1 = await fetchPaste(id, now);
      expect(result1).not.toBeNull();
      expect(result1?.remaining_views).toBe(1);

      const result2 = await fetchPaste(id, now);
      expect(result2).not.toBeNull();
      expect(result2?.remaining_views).toBe(0);

      // Third fetch should fail
      const result3 = await fetchPaste(id, now);
      expect(result3).toBeNull();
    });

    it('should calculate remaining_views correctly', async () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello', max_views: 5 },
        now,
        'http://localhost:3000'
      );

      const result1 = await fetchPaste(id, now);
      expect(result1?.remaining_views).toBe(4);

      const result2 = await fetchPaste(id, now);
      expect(result2?.remaining_views).toBe(3);

      const result3 = await fetchPaste(id, now);
      expect(result3?.remaining_views).toBe(2);
    });

    it('should return remaining_views as null for unlimited pastes', async () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello' },
        now,
        'http://localhost:3000'
      );

      const result = await fetchPaste(id, now);
      expect(result?.remaining_views).toBeNull();
    });

    it('should handle concurrent access without exceeding maxViews', async () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello', max_views: 3 },
        now,
        'http://localhost:3000'
      );

      // Simulate concurrent fetches
      const results = await Promise.all([
        fetchPaste(id, now),
        fetchPaste(id, now),
        fetchPaste(id, now),
        fetchPaste(id, now),
        fetchPaste(id, now),
      ]);

      // Only 3 should succeed
      const successfulFetches = results.filter((r) => r !== null);
      expect(successfulFetches.length).toBe(3);

      // Verify view count doesn't exceed maxViews
      const paste = await prisma.paste.findUnique({ where: { id } });
      expect(paste?.viewCount).toBe(3);
    });
  });

  describe('getPasteContent', () => {
    it('should return paste content and increment view count', async () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello, world!' },
        now,
        'http://localhost:3000'
      );

      const content = await getPasteContent(id, now);

      expect(content).toBe('Hello, world!');

      // Verify view count was incremented
      const paste = await prisma.paste.findUnique({ where: { id } });
      expect(paste?.viewCount).toBe(1);
    });

    it('should return null for non-existent paste', async () => {
      const now = new Date();
      const content = await getPasteContent('non-existent-id', now);
      expect(content).toBeNull();
    });

    it('should return null for expired paste', async () => {
      const createTime = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello', ttl_seconds: 60 },
        createTime,
        'http://localhost:3000'
      );

      // Fetch after expiry time
      const fetchTime = new Date('2021-01-01T00:02:00.000Z');
      const content = await getPasteContent(id, fetchTime);

      expect(content).toBeNull();
    });

    it('should return null when maxViews is reached', async () => {
      const now = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello', max_views: 1 },
        now,
        'http://localhost:3000'
      );

      // First fetch should succeed
      const content1 = await getPasteContent(id, now);
      expect(content1).toBe('Hello');

      // Second fetch should fail
      const content2 = await getPasteContent(id, now);
      expect(content2).toBeNull();
    });

    it('should return content when not yet expired', async () => {
      const createTime = new Date('2021-01-01T00:00:00.000Z');
      const { id } = await createPaste(
        { content: 'Hello', ttl_seconds: 60 },
        createTime,
        'http://localhost:3000'
      );

      // Fetch before expiry time
      const fetchTime = new Date('2021-01-01T00:00:30.000Z');
      const content = await getPasteContent(id, fetchTime);

      expect(content).toBe('Hello');
    });
  });
});
