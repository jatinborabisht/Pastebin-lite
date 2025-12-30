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
};

const headingStyles: React.CSSProperties = {
  fontSize: '6rem',
  fontWeight: 700,
  margin: 0,
  background: 'linear-gradient(135deg, #58a6ff 0%, #a371f7 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

const textStyles: React.CSSProperties = {
  fontSize: '1.25rem',
  color: '#8b949e',
  marginTop: '1rem',
};

const linkStyles: React.CSSProperties = {
  marginTop: '2rem',
  padding: '0.75rem 1.5rem',
  backgroundColor: '#238636',
  color: 'white',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '1rem',
  fontWeight: 500,
  transition: 'background-color 0.2s',
};

export default function NotFound() {
  return (
    <div style={containerStyles}>
      <h1 style={headingStyles}>404</h1>
      <p style={textStyles}>This page could not be found.</p>
      <a href="/" style={linkStyles}>
        Go back home
      </a>
    </div>
  );
}

