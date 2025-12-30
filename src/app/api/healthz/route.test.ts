import { describe, it, expect } from 'vitest';
import { GET } from './route';

describe('GET /api/healthz', () => {
  it('should return 200 status', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
  });

  it('should return { ok: true } JSON shape', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data).toEqual({ ok: true });
  });

  it('should verify database connectivity', async () => {
    // The GET handler tests database connectivity by running a query
    // If this test passes, it means the database is accessible
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
  });
});

