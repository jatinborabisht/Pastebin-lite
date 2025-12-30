/**
 * Integration verification tests for Task 12
 * These tests verify the complete system works as specified
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { POST as createPasteHandler } from '@/app/api/pastes/route';
import { GET as fetchPasteHandler } from '@/app/api/pastes/[id]/route';
import { GET as healthCheckHandler } from '@/app/api/healthz/route';
import { NextRequest } from 'next/server';

describe('Task 12: Final Integration Verification', () => {
  const originalTestMode = process.env.TEST_MODE;

  beforeAll(async () => {
    await prisma.paste.deleteMany();
  });

  afterAll(async () => {
    await prisma.paste.deleteMany();
    process.env.TEST_MODE = originalTestMode;
  });

  describe('12.1 API Routes Specification', () => {
    beforeEach(async () => {
      await prisma.paste.deleteMany();
    });

    describe('Health Check Endpoint', () => {
      it('should return { ok: true } with status 200', async () => {
        const response = await healthCheckHandler();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ ok: true });
      });
    });

    describe('Create Paste Endpoint', () => {
      it('should return 201 with id and url for valid input', async () => {
        const request = new NextRequest('http://localhost:3000/api/pastes', {
          method: 'POST',
          body: JSON.stringify({ content: 'Hello, world!' }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await createPasteHandler(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('url');
        expect(data.url).toContain('/p/');
        expect(data.url).toContain(data.id);
      });

      it('should return 400 for missing content', async () => {
        const request = new NextRequest('http://localhost:3000/api/pastes', {
          method: 'POST',
          body: JSON.stringify({}),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await createPasteHandler(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toHaveProperty('error');
      });

      it('should return 400 for empty content', async () => {
        const request = new NextRequest('http://localhost:3000/api/pastes', {
          method: 'POST',
          body: JSON.stringify({ content: '' }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await createPasteHandler(request);
        expect(response.status).toBe(400);
      });

      it('should store expiresAt when ttl_seconds provided', async () => {
        const request = new NextRequest('http://localhost:3000/api/pastes', {
          method: 'POST',
          body: JSON.stringify({ content: 'Test', ttl_seconds: 3600 }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await createPasteHandler(request);
        const data = await response.json();
        expect(response.status).toBe(201);

        const paste = await prisma.paste.findUnique({ where: { id: data.id } });
        expect(paste?.expiresAt).not.toBeNull();
      });

      it('should store maxViews when max_views provided', async () => {
        const request = new NextRequest('http://localhost:3000/api/pastes', {
          method: 'POST',
          body: JSON.stringify({ content: 'Test', max_views: 5 }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await createPasteHandler(request);
        const data = await response.json();
        expect(response.status).toBe(201);

        const paste = await prisma.paste.findUnique({ where: { id: data.id } });
        expect(paste?.maxViews).toBe(5);
      });
    });

    describe('Fetch Paste Endpoint', () => {
      it('should return 200 with content, remaining_views, and expires_at', async () => {
        // Create a paste first
        const createRequest = new NextRequest('http://localhost:3000/api/pastes', {
          method: 'POST',
          body: JSON.stringify({ content: 'Test content', max_views: 10 }),
          headers: { 'Content-Type': 'application/json' },
        });
        const createResponse = await createPasteHandler(createRequest);
        const createData = await createResponse.json();

        // Fetch it
        const fetchRequest = new NextRequest(`http://localhost:3000/api/pastes/${createData.id}`, {
          method: 'GET',
        });
        const response = await fetchPasteHandler(fetchRequest, { params: Promise.resolve({ id: createData.id }) });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.content).toBe('Test content');
        expect(data.remaining_views).toBe(9); // 10 - 1 (after view)
        expect(data.expires_at).toBeNull(); // No TTL set
      });

      it('should return expires_at as ISO 8601 string when TTL set', async () => {
        const createRequest = new NextRequest('http://localhost:3000/api/pastes', {
          method: 'POST',
          body: JSON.stringify({ content: 'Test content', ttl_seconds: 3600 }),
          headers: { 'Content-Type': 'application/json' },
        });
        const createResponse = await createPasteHandler(createRequest);
        const createData = await createResponse.json();

        const fetchRequest = new NextRequest(`http://localhost:3000/api/pastes/${createData.id}`, {
          method: 'GET',
        });
        const response = await fetchPasteHandler(fetchRequest, { params: Promise.resolve({ id: createData.id }) });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      });

      it('should return 404 for non-existent paste', async () => {
        const request = new NextRequest('http://localhost:3000/api/pastes/nonexistent123', {
          method: 'GET',
        });
        const response = await fetchPasteHandler(request, { params: Promise.resolve({ id: 'nonexistent123' }) });

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data).toHaveProperty('error');
      });

      it('should return 404 when max views reached', async () => {
        const createRequest = new NextRequest('http://localhost:3000/api/pastes', {
          method: 'POST',
          body: JSON.stringify({ content: 'Single view', max_views: 1 }),
          headers: { 'Content-Type': 'application/json' },
        });
        const createResponse = await createPasteHandler(createRequest);
        const createData = await createResponse.json();

        // First view
        const fetchRequest1 = new NextRequest(`http://localhost:3000/api/pastes/${createData.id}`, {
          method: 'GET',
        });
        const response1 = await fetchPasteHandler(fetchRequest1, { params: Promise.resolve({ id: createData.id }) });
        expect(response1.status).toBe(200);

        // Second view - should be 404
        const fetchRequest2 = new NextRequest(`http://localhost:3000/api/pastes/${createData.id}`, {
          method: 'GET',
        });
        const response2 = await fetchPasteHandler(fetchRequest2, { params: Promise.resolve({ id: createData.id }) });
        expect(response2.status).toBe(404);
      });
    });
  });

  describe('12.3 Deterministic Time Handling', () => {
    beforeEach(async () => {
      await prisma.paste.deleteMany();
    });

    it('should use x-test-now-ms header when TEST_MODE=1', async () => {
      process.env.TEST_MODE = '1';

      // Create paste at controlled time
      const createTime = new Date('2021-01-01T00:00:00.000Z').getTime();
      const createRequest = new NextRequest('http://localhost:3000/api/pastes', {
        method: 'POST',
        body: JSON.stringify({ content: 'Timed test', ttl_seconds: 60 }), // Expires in 60 seconds
        headers: {
          'Content-Type': 'application/json',
          'x-test-now-ms': createTime.toString(),
        },
      });
      const createResponse = await createPasteHandler(createRequest);
      const createData = await createResponse.json();
      expect(createResponse.status).toBe(201);

      // Fetch before expiry (30 seconds later)
      const beforeExpiry = new Date('2021-01-01T00:00:30.000Z').getTime();
      const fetchRequest1 = new NextRequest(`http://localhost:3000/api/pastes/${createData.id}`, {
        method: 'GET',
        headers: {
          'x-test-now-ms': beforeExpiry.toString(),
        },
      });
      const response1 = await fetchPasteHandler(fetchRequest1, { params: Promise.resolve({ id: createData.id }) });
      expect(response1.status).toBe(200);

      // Fetch after expiry (61 seconds after creation)
      const afterExpiry = new Date('2021-01-01T00:01:01.000Z').getTime();
      const fetchRequest2 = new NextRequest(`http://localhost:3000/api/pastes/${createData.id}`, {
        method: 'GET',
        headers: {
          'x-test-now-ms': afterExpiry.toString(),
        },
      });
      const response2 = await fetchPasteHandler(fetchRequest2, { params: Promise.resolve({ id: createData.id }) });
      expect(response2.status).toBe(404);

      process.env.TEST_MODE = originalTestMode;
    });

    it('should fall back to real time without header in TEST_MODE', async () => {
      process.env.TEST_MODE = '1';

      const createRequest = new NextRequest('http://localhost:3000/api/pastes', {
        method: 'POST',
        body: JSON.stringify({ content: 'No header test' }),
        headers: { 'Content-Type': 'application/json' },
        // No x-test-now-ms header
      });
      const createResponse = await createPasteHandler(createRequest);
      expect(createResponse.status).toBe(201);

      const createData = await createResponse.json();
      const paste = await prisma.paste.findUnique({ where: { id: createData.id } });
      
      // createdAt should be close to now (within last few seconds)
      const now = Date.now();
      const createdTime = paste?.createdAt.getTime() || 0;
      expect(now - createdTime).toBeLessThan(5000);

      process.env.TEST_MODE = originalTestMode;
    });

    it('should ignore header when TEST_MODE is not 1', async () => {
      process.env.TEST_MODE = '0';

      const fakeTime = new Date('2000-01-01T00:00:00.000Z').getTime();
      const createRequest = new NextRequest('http://localhost:3000/api/pastes', {
        method: 'POST',
        body: JSON.stringify({ content: 'Real time test' }),
        headers: {
          'Content-Type': 'application/json',
          'x-test-now-ms': fakeTime.toString(),
        },
      });
      const createResponse = await createPasteHandler(createRequest);
      expect(createResponse.status).toBe(201);

      const createData = await createResponse.json();
      const paste = await prisma.paste.findUnique({ where: { id: createData.id } });
      
      // createdAt should be close to now, not year 2000
      const now = Date.now();
      const createdTime = paste?.createdAt.getTime() || 0;
      expect(now - createdTime).toBeLessThan(5000);

      process.env.TEST_MODE = originalTestMode;
    });
  });

  describe('12.4 Data Persistence', () => {
    it('should persist data across database operations', async () => {
      // Create a paste
      const createRequest = new NextRequest('http://localhost:3000/api/pastes', {
        method: 'POST',
        body: JSON.stringify({ content: 'Persistent data test' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const createResponse = await createPasteHandler(createRequest);
      const createData = await createResponse.json();
      expect(createResponse.status).toBe(201);

      // Verify it exists in database
      const paste = await prisma.paste.findUnique({ where: { id: createData.id } });
      expect(paste).not.toBeNull();
      expect(paste?.content).toBe('Persistent data test');

      // Disconnect and reconnect to database (simulates restart)
      await prisma.$disconnect();
      await prisma.$connect();

      // Fetch the paste again
      const fetchRequest = new NextRequest(`http://localhost:3000/api/pastes/${createData.id}`, {
        method: 'GET',
      });
      const response = await fetchPasteHandler(fetchRequest, { params: Promise.resolve({ id: createData.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content).toBe('Persistent data test');
    });
  });
});

