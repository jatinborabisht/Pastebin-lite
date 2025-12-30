/**
 * Paste service layer with atomic operations
 */

import { prisma } from './db';
import { calculateExpiresAt, isPasteExpired } from './time';
import { ValidatedCreatePasteInput } from './validation';

/**
 * Response from creating a paste
 */
export interface PasteCreateResponse {
  id: string;
  url: string;
}

/**
 * Response from fetching a paste
 */
export interface PasteFetchResponse {
  content: string;
  remaining_views: number | null;
  expires_at: string | null;
}

/**
 * Create a new paste
 * @param input Validated paste input
 * @param now Current time
 * @param baseUrl Base URL for constructing paste URL
 * @returns Created paste response with id and url
 */
export async function createPaste(
  input: ValidatedCreatePasteInput,
  now: Date,
  baseUrl: string
): Promise<PasteCreateResponse> {
  const expiresAt = input.ttl_seconds
    ? calculateExpiresAt(input.ttl_seconds, now)
    : null;

  const paste = await prisma.paste.create({
    data: {
      content: input.content,
      expiresAt,
      maxViews: input.max_views ?? null,
    },
  });

  return {
    id: paste.id,
    url: `${baseUrl}/p/${paste.id}`,
  };
}

/**
 * Fetch a paste by ID with atomic view count increment
 * @param id Paste ID
 * @param now Current time
 * @returns Paste fetch response or null if unavailable
 */
export async function fetchPaste(
  id: string,
  now: Date
): Promise<PasteFetchResponse | null> {
  // Use a transaction to ensure atomic read-check-update
  return await prisma.$transaction(async (tx) => {
    // Find the paste
    const paste = await tx.paste.findUnique({
      where: { id },
    });

    // Return null if paste doesn't exist
    if (!paste) {
      return null;
    }

    // Check if paste is expired by time
    if (isPasteExpired(paste.expiresAt, now)) {
      return null;
    }

    // Check if paste has reached maxViews limit
    if (paste.maxViews !== null && paste.viewCount >= paste.maxViews) {
      return null;
    }

    // Increment view count atomically
    const updatedPaste = await tx.paste.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    // Calculate remaining views (null if unlimited, never negative)
    let remaining_views: number | null = null;
    if (updatedPaste.maxViews !== null) {
      remaining_views = Math.max(0, updatedPaste.maxViews - updatedPaste.viewCount);
    }

    return {
      content: updatedPaste.content,
      remaining_views,
      expires_at: updatedPaste.expiresAt ? updatedPaste.expiresAt.toISOString() : null,
    };
  });
}

/**
 * Get paste content for HTML view with atomic view count increment
 * @param id Paste ID
 * @param now Current time
 * @returns Paste content string or null if unavailable
 */
export async function getPasteContent(
  id: string,
  now: Date
): Promise<string | null> {
  // Use a transaction to ensure atomic read-check-update
  return await prisma.$transaction(async (tx) => {
    // Find the paste
    const paste = await tx.paste.findUnique({
      where: { id },
    });

    // Return null if paste doesn't exist
    if (!paste) {
      return null;
    }

    // Check if paste is expired by time
    if (isPasteExpired(paste.expiresAt, now)) {
      return null;
    }

    // Check if paste has reached maxViews limit
    if (paste.maxViews !== null && paste.viewCount >= paste.maxViews) {
      return null;
    }

    // Increment view count atomically
    const updatedPaste = await tx.paste.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return updatedPaste.content;
  });
}
