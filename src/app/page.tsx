'use client';

import { useState, FormEvent } from 'react';
import styles from './page.module.css';

interface CreatePasteResponse {
  id: string;
  url: string;
}

interface ErrorResponse {
  error: string;
  details?: Array<{ field: string; message: string }>;
}

export default function Home() {
  const [content, setContent] = useState('');
  const [ttlSeconds, setTtlSeconds] = useState('');
  const [maxViews, setMaxViews] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setCreatedUrl(null);

    try {
      const body: Record<string, unknown> = { content };
      
      if (ttlSeconds) {
        const ttl = parseInt(ttlSeconds, 10);
        if (isNaN(ttl) || ttl < 1) {
          setError('TTL must be a positive integer');
          setIsLoading(false);
          return;
        }
        body.ttl_seconds = ttl;
      }
      
      if (maxViews) {
        const views = parseInt(maxViews, 10);
        if (isNaN(views) || views < 1) {
          setError('Max views must be a positive integer');
          setIsLoading(false);
          return;
        }
        body.max_views = views;
      }

      const response = await fetch('/api/pastes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        if (errorData.details && errorData.details.length > 0) {
          setError(errorData.details.map(d => d.message).join(', '));
        } else {
          setError(errorData.error || 'Failed to create paste');
        }
        return;
      }

      const data: CreatePasteResponse = await response.json();
      setCreatedUrl(data.url);
      setContent('');
      setTtlSeconds('');
      setMaxViews('');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Pastebin Lite</h1>
        <p className={styles.subtitle}>Share text snippets with optional expiration</p>
      </header>

      <main className={styles.main}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="content" className={styles.label}>
              Content
            </label>
            <textarea
              id="content"
              className={styles.textarea}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your text here..."
              rows={12}
              required
            />
          </div>

          <div className={styles.optionsRow}>
            <div className={styles.formGroup}>
              <label htmlFor="ttl" className={styles.label}>
                Expires after (seconds)
                <span className={styles.optional}>optional</span>
              </label>
              <input
                type="number"
                id="ttl"
                className={styles.input}
                value={ttlSeconds}
                onChange={(e) => setTtlSeconds(e.target.value)}
                placeholder="e.g., 3600"
                min="1"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="maxViews" className={styles.label}>
                Max views
                <span className={styles.optional}>optional</span>
              </label>
              <input
                type="number"
                id="maxViews"
                className={styles.input}
                value={maxViews}
                onChange={(e) => setMaxViews(e.target.value)}
                placeholder="e.g., 10"
                min="1"
              />
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading || !content.trim()}
          >
            {isLoading ? 'Creating...' : 'Create Paste'}
          </button>
        </form>

        {error && (
          <div className={styles.errorMessage} role="alert">
            {error}
          </div>
        )}

        {createdUrl && (
          <div className={styles.successMessage}>
            <p>Paste created successfully!</p>
            <a href={createdUrl} className={styles.pasteLink}>
              {createdUrl}
            </a>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>Simple. Fast. Ephemeral.</p>
      </footer>
    </div>
  );
}
