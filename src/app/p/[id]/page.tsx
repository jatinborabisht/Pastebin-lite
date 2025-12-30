import { notFound } from 'next/navigation';
import { getPasteContent } from '@/lib/paste-service';

interface PastePageProps {
  params: Promise<{ id: string }>;
}

const containerStyles: React.CSSProperties = {
  minHeight: '100vh',
  padding: '2rem',
  backgroundColor: '#1a1a2e',
  color: '#eaeaea',
};

const contentStyles: React.CSSProperties = {
  fontFamily: "'Fira Code', 'Monaco', 'Consolas', monospace",
  fontSize: '14px',
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
  wordWrap: 'break-word',
  backgroundColor: '#16213e',
  padding: '1.5rem',
  borderRadius: '8px',
  border: '1px solid #0f3460',
  overflowX: 'auto',
  margin: 0,
};

/**
 * HTML view page for displaying a paste
 * Uses Server Component with real system time (not TEST_MODE)
 */
export default async function PastePage({ params }: PastePageProps) {
  const { id } = await params;

  // Use real system time for server components (not TEST_MODE)
  const now = new Date();

  // Get paste content using service function
  const content = await getPasteContent(id, now);

  // Return 404 if paste is not available
  if (content === null) {
    notFound();
  }

  return (
    <div style={containerStyles}>
      <pre style={contentStyles}>{content}</pre>
    </div>
  );
}

