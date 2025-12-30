import { describe, it, expect } from 'vitest';
import { validateCreatePaste, ValidationResult } from './validation';

describe('Validation', () => {
  describe('validateCreatePaste', () => {
    describe('valid inputs', () => {
      it('should pass validation with only content', () => {
        const result = validateCreatePaste({ content: 'Hello, world!' });

        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data.content).toBe('Hello, world!');
          expect(result.data.ttl_seconds).toBeUndefined();
          expect(result.data.max_views).toBeUndefined();
        }
      });

      it('should pass validation with content and ttl_seconds', () => {
        const result = validateCreatePaste({ content: 'Hello', ttl_seconds: 3600 });

        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data.content).toBe('Hello');
          expect(result.data.ttl_seconds).toBe(3600);
          expect(result.data.max_views).toBeUndefined();
        }
      });

      it('should pass validation with content and max_views', () => {
        const result = validateCreatePaste({ content: 'Hello', max_views: 5 });

        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data.content).toBe('Hello');
          expect(result.data.ttl_seconds).toBeUndefined();
          expect(result.data.max_views).toBe(5);
        }
      });

      it('should pass validation with all fields', () => {
        const result = validateCreatePaste({
          content: 'Hello',
          ttl_seconds: 60,
          max_views: 10,
        });

        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data.content).toBe('Hello');
          expect(result.data.ttl_seconds).toBe(60);
          expect(result.data.max_views).toBe(10);
        }
      });

      it('should pass validation with ttl_seconds = 1 (minimum)', () => {
        const result = validateCreatePaste({ content: 'Hello', ttl_seconds: 1 });

        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data.ttl_seconds).toBe(1);
        }
      });

      it('should pass validation with max_views = 1 (minimum)', () => {
        const result = validateCreatePaste({ content: 'Hello', max_views: 1 });

        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data.max_views).toBe(1);
        }
      });

      it('should pass validation with large ttl_seconds', () => {
        const result = validateCreatePaste({ content: 'Hello', ttl_seconds: 86400 * 365 });

        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data.ttl_seconds).toBe(86400 * 365);
        }
      });

      it('should pass validation with large max_views', () => {
        const result = validateCreatePaste({ content: 'Hello', max_views: 1000000 });

        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data.max_views).toBe(1000000);
        }
      });
    });

    describe('missing content', () => {
      it('should return error when content is missing', () => {
        const result = validateCreatePaste({} as any);

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].field).toBe('content');
          expect(result.errors[0].message).toBe('content is required');
        }
      });

      it('should return error when content is undefined', () => {
        const result = validateCreatePaste({ content: undefined });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].field).toBe('content');
          expect(result.errors[0].message).toBe('content is required');
        }
      });

      it('should return error when content is null', () => {
        const result = validateCreatePaste({ content: null });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].field).toBe('content');
          expect(result.errors[0].message).toBe('content is required');
        }
      });
    });

    describe('empty content', () => {
      it('should return error when content is empty string', () => {
        const result = validateCreatePaste({ content: '' });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].field).toBe('content');
          expect(result.errors[0].message).toBe('content cannot be empty');
        }
      });
    });

    describe('invalid content type', () => {
      it('should return error when content is a number', () => {
        const result = validateCreatePaste({ content: 123 });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].field).toBe('content');
          expect(result.errors[0].message).toBe('content must be a string');
        }
      });

      it('should return error when content is an array', () => {
        const result = validateCreatePaste({ content: ['hello'] });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].field).toBe('content');
          expect(result.errors[0].message).toBe('content must be a string');
        }
      });

      it('should return error when content is an object', () => {
        const result = validateCreatePaste({ content: { text: 'hello' } });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].field).toBe('content');
          expect(result.errors[0].message).toBe('content must be a string');
        }
      });

      it('should return error when content is a boolean', () => {
        const result = validateCreatePaste({ content: true });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].field).toBe('content');
          expect(result.errors[0].message).toBe('content must be a string');
        }
      });
    });

    describe('invalid ttl_seconds values', () => {
      it('should return error when ttl_seconds is 0', () => {
        const result = validateCreatePaste({ content: 'Hello', ttl_seconds: 0 });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].field).toBe('ttl_seconds');
          expect(result.errors[0].message).toBe('ttl_seconds must be an integer >= 1');
        }
      });

      it('should return error when ttl_seconds is negative', () => {
        const result = validateCreatePaste({ content: 'Hello', ttl_seconds: -1 });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].field).toBe('ttl_seconds');
          expect(result.errors[0].message).toBe('ttl_seconds must be an integer >= 1');
        }
      });

      it('should return error when ttl_seconds is a string', () => {
        const result = validateCreatePaste({ content: 'Hello', ttl_seconds: '60' });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].field).toBe('ttl_seconds');
          expect(result.errors[0].message).toBe('ttl_seconds must be an integer >= 1');
        }
      });

      it('should return error when ttl_seconds is a float', () => {
        const result = validateCreatePaste({ content: 'Hello', ttl_seconds: 60.5 });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].field).toBe('ttl_seconds');
          expect(result.errors[0].message).toBe('ttl_seconds must be an integer >= 1');
        }
      });

      it('should return error when ttl_seconds is NaN', () => {
        const result = validateCreatePaste({ content: 'Hello', ttl_seconds: NaN });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].field).toBe('ttl_seconds');
          expect(result.errors[0].message).toBe('ttl_seconds must be an integer >= 1');
        }
      });

      it('should return error when ttl_seconds is Infinity', () => {
        const result = validateCreatePaste({ content: 'Hello', ttl_seconds: Infinity });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].field).toBe('ttl_seconds');
          expect(result.errors[0].message).toBe('ttl_seconds must be an integer >= 1');
        }
      });
    });

    describe('invalid max_views values', () => {
      it('should return error when max_views is 0', () => {
        const result = validateCreatePaste({ content: 'Hello', max_views: 0 });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].field).toBe('max_views');
          expect(result.errors[0].message).toBe('max_views must be an integer >= 1');
        }
      });

      it('should return error when max_views is negative', () => {
        const result = validateCreatePaste({ content: 'Hello', max_views: -5 });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].field).toBe('max_views');
          expect(result.errors[0].message).toBe('max_views must be an integer >= 1');
        }
      });

      it('should return error when max_views is a string', () => {
        const result = validateCreatePaste({ content: 'Hello', max_views: '10' });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].field).toBe('max_views');
          expect(result.errors[0].message).toBe('max_views must be an integer >= 1');
        }
      });

      it('should return error when max_views is a float', () => {
        const result = validateCreatePaste({ content: 'Hello', max_views: 5.5 });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].field).toBe('max_views');
          expect(result.errors[0].message).toBe('max_views must be an integer >= 1');
        }
      });

      it('should return error when max_views is NaN', () => {
        const result = validateCreatePaste({ content: 'Hello', max_views: NaN });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].field).toBe('max_views');
          expect(result.errors[0].message).toBe('max_views must be an integer >= 1');
        }
      });

      it('should return error when max_views is Infinity', () => {
        const result = validateCreatePaste({ content: 'Hello', max_views: Infinity });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].field).toBe('max_views');
          expect(result.errors[0].message).toBe('max_views must be an integer >= 1');
        }
      });
    });

    describe('multiple errors', () => {
      it('should return multiple errors for multiple invalid fields', () => {
        const result = validateCreatePaste({
          content: '',
          ttl_seconds: -1,
          max_views: 0,
        });

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(3);
          expect(result.errors.map((e) => e.field)).toContain('content');
          expect(result.errors.map((e) => e.field)).toContain('ttl_seconds');
          expect(result.errors.map((e) => e.field)).toContain('max_views');
        }
      });

      it('should return errors for missing content and invalid optional fields', () => {
        const result = validateCreatePaste({
          ttl_seconds: 'invalid',
          max_views: 'invalid',
        } as any);

        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors).toHaveLength(3);
          expect(result.errors.map((e) => e.field)).toContain('content');
          expect(result.errors.map((e) => e.field)).toContain('ttl_seconds');
          expect(result.errors.map((e) => e.field)).toContain('max_views');
        }
      });
    });

    describe('null optional fields', () => {
      it('should ignore null ttl_seconds', () => {
        const result = validateCreatePaste({ content: 'Hello', ttl_seconds: null });

        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data.ttl_seconds).toBeUndefined();
        }
      });

      it('should ignore null max_views', () => {
        const result = validateCreatePaste({ content: 'Hello', max_views: null });

        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data.max_views).toBeUndefined();
        }
      });
    });
  });
});

