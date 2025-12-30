import { NextRequest, NextResponse } from 'next/server';
import { fetchPaste } from '@/lib/paste-service';
import { getCurrentTime } from '@/lib/time';

/**
 * GET /api/pastes/[id]
 * Fetch a paste by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get current time using time utilities (TEST_MODE support)
    const now = getCurrentTime(request.headers);

    // Call fetchPaste service function
    const result = await fetchPaste(id, now);

    // Return 404 with JSON error if paste is null
    if (result === null) {
      return NextResponse.json(
        { error: 'Paste not found' },
        { status: 404 }
      );
    }

    // Return 200 with content, remaining_views, and expires_at on success
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error fetching paste:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

