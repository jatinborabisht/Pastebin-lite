/**
 * Validation layer for paste creation inputs
 */

/**
 * Input interface for creating a paste
 */
export interface CreatePasteInput {
  content: unknown;
  ttl_seconds?: unknown;
  max_views?: unknown;
}

/**
 * Validated paste input with correct types
 */
export interface ValidatedCreatePasteInput {
  content: string;
  ttl_seconds?: number;
  max_views?: number;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Result type for validation - discriminated union
 */
export type ValidationResult =
  | { valid: true; data: ValidatedCreatePasteInput }
  | { valid: false; errors: ValidationError[] };

/**
 * Check if a value is a positive integer (>= 1)
 */
function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

/**
 * Validate create paste input
 * @param input Raw input from request
 * @returns Validation result with either validated data or errors
 */
export function validateCreatePaste(input: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  // Handle non-object input
  if (typeof input !== 'object' || input === null) {
    return {
      valid: false,
      errors: [{ field: 'body', message: 'Request body must be an object' }],
    };
  }

  const data = input as Record<string, unknown>;

  // Validate content - must be a non-empty string
  if (data.content === undefined || data.content === null) {
    errors.push({
      field: 'content',
      message: 'content is required',
    });
  } else if (typeof data.content !== 'string') {
    errors.push({
      field: 'content',
      message: 'content must be a string',
    });
  } else if (data.content.length === 0) {
    errors.push({
      field: 'content',
      message: 'content cannot be empty',
    });
  }

  // Validate ttl_seconds - optional, but if present must be integer >= 1
  if (data.ttl_seconds !== undefined && data.ttl_seconds !== null) {
    if (!isPositiveInteger(data.ttl_seconds)) {
      errors.push({
        field: 'ttl_seconds',
        message: 'ttl_seconds must be an integer >= 1',
      });
    }
  }

  // Validate max_views - optional, but if present must be integer >= 1
  if (data.max_views !== undefined && data.max_views !== null) {
    if (!isPositiveInteger(data.max_views)) {
      errors.push({
        field: 'max_views',
        message: 'max_views must be an integer >= 1',
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      content: data.content as string,
      ttl_seconds: data.ttl_seconds != null ? (data.ttl_seconds as number) : undefined,
      max_views: data.max_views != null ? (data.max_views as number) : undefined,
    },
  };
}

