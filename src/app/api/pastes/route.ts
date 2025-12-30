import { NextRequest, NextResponse } from 'next/server';
import { validateCreatePaste } from '@/lib/validation';
import { createPaste } from '@/lib/paste-service';
import { getCurrentTime } from '@/lib/time';

/**
 * POST /api/pastes
 * Create a new paste
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request JSON body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate input using validation layer
    const validation = validateCreatePaste(body);

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Get current time using time utilities (TEST_MODE support)
    const now = getCurrentTime(request.headers);

    // Construct base URL from request
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Call createPaste service function
    const result = await createPaste(validation.data, now, baseUrl);

    // Return 201 with id and url on success
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating paste:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

