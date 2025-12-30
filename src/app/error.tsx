'use client';

import { useEffect } from 'react';

const containerStyles: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#0d1117',
  color: '#f0f6fc',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  padding: '2rem',
  textAlign: 'center',
};

const iconStyles: React.CSSProperties = {
  fontSize: '4rem',
  marginBottom: '1rem',
};

const headingStyles: React.CSSProperties = {
  fontSize: '2.5rem',
  fontWeight: 700,
  margin: 0,
  background: 'linear-gradient(135deg, #f85149 0%, #da3633 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

const textStyles: React.CSSProperties = {
  fontSize: '1.1rem',
  color: '#8b949e',
  marginTop: '1rem',
  maxWidth: '400px',
  lineHeight: 1.6,
};

const buttonContainerStyles: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  marginTop: '2rem',
};

const primaryButtonStyles: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  backgroundColor: '#238636',
  color: 'white',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '1rem',
  fontWeight: 500,
  border: 'none',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const secondaryButtonStyles: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  backgroundColor: '#21262d',
  color: '#c9d1d9',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '1rem',
  fontWeight: 500,
  border: '1px solid #30363d',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('Application error:', error);
  }, [error]);

  return (
    <div style={containerStyles}>
      <div style={iconStyles}>⚠️</div>
      <h1 style={headingStyles}>Something went wrong</h1>
      <p style={textStyles}>
        An unexpected error occurred. Don&apos;t worry, you can try again or go back to the home page.
      </p>
      <div style={buttonContainerStyles}>
        <button
          onClick={reset}
          style={primaryButtonStyles}
        >
          Try again
        </button>
        <a href="/" style={secondaryButtonStyles}>
          Go back home
        </a>
      </div>
    </div>
  );
}

