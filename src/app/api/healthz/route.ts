import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/healthz
 * Health check endpoint to verify service and database connectivity
 */
export async function GET() {
  try {
    // Test database connectivity with a simple query
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}

