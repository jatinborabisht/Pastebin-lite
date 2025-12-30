import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { createPaste } from '@/lib/paste-service';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

// Import after mocking
import PastePage from './page';
import { notFound } from 'next/navigation';

describe('GET /p/[id] (HTML view)', () => {
  beforeEach(async () => {
    await prisma.paste.deleteMany();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await prisma.paste.deleteMany();
  });

  describe('available paste', () => {
    it('should return component with paste content', async () => {
      const now = new Date();
      const { id } = await createPaste(
        { content: 'Hello, world!' },
        now,
        'http://localhost:3000'
      );

      const result = await PastePage({ params: Promise.resolve({ id }) });

      // Check that the result is a valid React element
      expect(result).toBeDefined();
      expect(result.type).toBe('div');
      
      // Check the content is in a pre tag (now using inline styles)
      const preElement = result.props.children;
      expect(preElement.type).toBe('pre');
      expect(preElement.props.children).toBe('Hello, world!');
    });

    it('should render content in pre tag with inline styles', async () => {
      const now = new Date();
      const { id } = await createPaste(
        { content: 'Test content for pre tag' },
        now,
        'http://localhost:3000'
      );

      const result = await PastePage({ params: Promise.resolve({ id }) });

      const preElement = result.props.children;
      expect(preElement.type).toBe('pre');
      // With inline styles, there's no className
      expect(preElement.props.style).toBeDefined();
      expect(preElement.props.children).toBe('Test content for pre tag');
    });

    it('should increment view count when rendered', async () => {
      const now = new Date();
      const { id } = await createPaste(
        { content: 'Hello' },
        now,
        'http://localhost:3000'
      );

      await PastePage({ params: Promise.resolve({ id }) });

      const paste = await prisma.paste.findUnique({ where: { id } });
      expect(paste?.viewCount).toBe(1);
    });
  });

  describe('404 errors', () => {
    it('should call notFound for non-existent paste', async () => {
      await expect(
        PastePage({ params: Promise.resolve({ id: 'non-existent-id' }) })
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(notFound).toHaveBeenCalled();
    });

    it('should call notFound for expired paste', async () => {
      // Create paste that's already expired
      const pastTime = new Date(Date.now() - 3600 * 1000); // 1 hour ago
      const { id } = await createPaste(
        { content: 'Hello', ttl_seconds: 60 }, // Expires 1 minute after creation
        pastTime,
        'http://localhost:3000'
      );

      await expect(
        PastePage({ params: Promise.resolve({ id }) })
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(notFound).toHaveBeenCalled();
    });

    it('should call notFound for paste at maxViews limit', async () => {
      const now = new Date();
      const { id } = await createPaste(
        { content: 'Hello', max_views: 1 },
        now,
        'http://localhost:3000'
      );

      // First render should succeed
      await PastePage({ params: Promise.resolve({ id }) });

      // Second render should fail (maxViews reached)
      await expect(
        PastePage({ params: Promise.resolve({ id }) })
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(notFound).toHaveBeenCalled();
    });
  });

  describe('safe content rendering', () => {
    it('should safely render content with HTML tags (no script execution)', async () => {
      const now = new Date();
      const maliciousContent = '<script>alert("XSS")</script><img onerror="alert(1)" src="x">';
      const { id } = await createPaste(
        { content: maliciousContent },
        now,
        'http://localhost:3000'
      );

      const result = await PastePage({ params: Promise.resolve({ id }) });

      // The content should be rendered as-is (text, not HTML)
      // React's JSX automatically escapes content in text nodes
      const preElement = result.props.children;
      expect(preElement.props.children).toBe(maliciousContent);
      
      // The content is stored as a string child, not parsed as HTML
      expect(typeof preElement.props.children).toBe('string');
    });

    it('should preserve special characters in content', async () => {
      const now = new Date();
      const specialContent = '& < > " \' / \\ \n \t';
      const { id } = await createPaste(
        { content: specialContent },
        now,
        'http://localhost:3000'
      );

      const result = await PastePage({ params: Promise.resolve({ id }) });

      const preElement = result.props.children;
      expect(preElement.props.children).toBe(specialContent);
    });

    it('should handle multiline content', async () => {
      const now = new Date();
      const multilineContent = 'Line 1\nLine 2\nLine 3\n  Indented line';
      const { id } = await createPaste(
        { content: multilineContent },
        now,
        'http://localhost:3000'
      );

      const result = await PastePage({ params: Promise.resolve({ id }) });

      const preElement = result.props.children;
      expect(preElement.props.children).toBe(multilineContent);
    });
  });
});

