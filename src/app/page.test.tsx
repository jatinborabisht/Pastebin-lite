/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from './page';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Home Page - Create Paste Form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('form rendering', () => {
    it('should render the form with all elements', () => {
      render(<Home />);

      expect(screen.getByRole('heading', { name: /pastebin lite/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/content/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/expires after/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/max views/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create paste/i })).toBeInTheDocument();
    });

    it('should disable submit button when content is empty', () => {
      render(<Home />);

      const submitButton = screen.getByRole('button', { name: /create paste/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when content is provided', async () => {
      render(<Home />);
      const user = userEvent.setup();

      const textarea = screen.getByLabelText(/content/i);
      await user.type(textarea, 'Hello, world!');

      const submitButton = screen.getByRole('button', { name: /create paste/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('form submission - success', () => {
    it('should create paste and display URL on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'test-id-123',
          url: 'http://localhost:3000/p/test-id-123',
        }),
      });

      render(<Home />);
      const user = userEvent.setup();

      // Fill in content
      const textarea = screen.getByLabelText(/content/i);
      await user.type(textarea, 'Test paste content');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create paste/i });
      await user.click(submitButton);

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/paste created successfully/i)).toBeInTheDocument();
      });

      // Check URL is displayed
      const link = screen.getByRole('link', { name: /localhost/i });
      expect(link).toHaveAttribute('href', 'http://localhost:3000/p/test-id-123');
    });

    it('should clear form after successful submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'test-id',
          url: 'http://localhost:3000/p/test-id',
        }),
      });

      render(<Home />);
      const user = userEvent.setup();

      const textarea = screen.getByLabelText(/content/i) as HTMLTextAreaElement;
      await user.type(textarea, 'Test content');

      const submitButton = screen.getByRole('button', { name: /create paste/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });

    it('should send TTL and max views when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'test-id',
          url: 'http://localhost:3000/p/test-id',
        }),
      });

      render(<Home />);
      const user = userEvent.setup();

      // Fill in all fields
      await user.type(screen.getByLabelText(/content/i), 'Test content');
      await user.type(screen.getByLabelText(/expires after/i), '3600');
      await user.type(screen.getByLabelText(/max views/i), '10');

      // Submit form
      await user.click(screen.getByRole('button', { name: /create paste/i }));

      // Verify fetch was called with correct body
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/pastes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'Test content',
            ttl_seconds: 3600,
            max_views: 10,
          }),
        });
      });
    });
  });

  describe('form submission - errors', () => {
    it('should display error message on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Validation failed',
          details: [{ field: 'content', message: 'content cannot be empty' }],
        }),
      });

      render(<Home />);
      const user = userEvent.setup();

      // Type and clear to enable submit (content required in HTML)
      const textarea = screen.getByLabelText(/content/i);
      await user.type(textarea, 'x');

      // Mock the form allowing empty submit
      await user.click(screen.getByRole('button', { name: /create paste/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('content cannot be empty');
      });
    });

    it('should display server validation error for invalid TTL', async () => {
      // Mock API to return a validation error for invalid TTL
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Validation failed',
          details: [{ field: 'ttl_seconds', message: 'ttl_seconds must be an integer >= 1' }],
        }),
      });

      render(<Home />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/content/i), 'Test');
      await user.type(screen.getByLabelText(/expires after/i), '1'); // Valid value for client, let server reject

      await user.click(screen.getByRole('button', { name: /create paste/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/ttl_seconds must be an integer/i);
      });
    });

    it('should display server validation error for invalid max views', async () => {
      // Mock API to return a validation error for invalid max_views
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Validation failed',
          details: [{ field: 'max_views', message: 'max_views must be an integer >= 1' }],
        }),
      });

      render(<Home />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/content/i), 'Test');
      await user.type(screen.getByLabelText(/max views/i), '1'); // Valid value for client, let server reject

      await user.click(screen.getByRole('button', { name: /create paste/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/max_views must be an integer/i);
      });
    });

    it('should display network error message', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<Home />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/content/i), 'Test');
      await user.click(screen.getByRole('button', { name: /create paste/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/Network error/i);
      });
    });
  });

  describe('loading state', () => {
    it('should show loading state during submission', async () => {
      // Create a promise we can control
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(pendingPromise);

      render(<Home />);
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/content/i), 'Test');
      await user.click(screen.getByRole('button', { name: /create paste/i }));

      // Should show loading text
      expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({ id: 'test', url: 'http://localhost/p/test' }),
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create paste/i })).toBeInTheDocument();
      });
    });
  });
});
