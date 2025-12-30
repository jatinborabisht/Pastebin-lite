# Design Document: Pastebin-Lite

## Overview

Pastebin-Lite is a Next.js application using the App Router architecture with TypeScript, SQLite (via Prisma ORM), and Node runtime. The application provides REST API endpoints and HTML pages for creating and viewing text pastes with optional expiry constraints (TTL and view limits).

### Key Design Principles

1. **Strict API Contract**: All routes, response shapes, and status codes follow the exact specification
2. **Atomic Operations**: View count increments and expiry checks use database transactions
3. **Deterministic Testing**: Support for controlled time via TEST_MODE environment variable
4. **Persistent Storage**: SQLite database ensures data survives restarts
5. **Security**: HTML content rendering prevents XSS attacks

## Architecture

### Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js (not Edge)
- **Database**: SQLite
- **ORM**: Prisma
- **Deployment**: Local development (port 3000)

### Project Structure

```
pastebin-lite/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── healthz/
│   │   │   │   └── route.ts          # Health check endpoint
│   │   │   └── pastes/
│   │   │       ├── route.ts          # POST /api/pastes
│   │   │       └── [id]/
│   │   │           └── route.ts      # GET /api/pastes/:id
│   │   ├── p/
│   │   │   └── [id]/
│   │   │       └── page.tsx          # GET /p/:id (HTML view)
│   │   ├── page.tsx                  # Home page (create paste form)
│   │   └── layout.tsx                # Root layout
│   ├── lib/
│   │   ├── db.ts                     # Prisma client singleton
│   │   ├── time.ts                   # Time utilities (TEST_MODE support)
│   │   ├── paste-service.ts          # Business logic for pastes
│   │   └── validation.ts             # Input validation utilities
│   └── types/
│       └── paste.ts                  # TypeScript interfaces
├── prisma/
│   └── schema.prisma                 # Database schema
├── package.json
├── tsconfig.json
├── next.config.js
└── .env                              # Environment variables
```

## Components and Interfaces

### 1. Database Layer (Prisma)

#### Schema Design

```prisma
model Paste {
  id         String    @id @default(cuid())
  content    String
  createdAt  DateTime  @default(now())
  expiresAt  DateTime?
  maxViews   Int?
  viewCount  Int       @default(0)
}
```

**Design Decisions:**
- `id`: Using `cuid()` for collision-resistant, URL-safe identifiers
- `content`: Text field for paste content (no length limit in SQLite)
- `createdAt`: Automatic timestamp for audit trail
- `expiresAt`: Nullable for pastes without TTL
- `maxViews`: Nullable for unlimited view pastes
- `viewCount`: Defaults to 0, incremented atomically

#### Prisma Client Singleton

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**Design Rationale:**
- Singleton pattern prevents connection pool exhaustion in development
- Global reference survives Next.js hot reloads

### 2. Time Utilities

```typescript
// src/lib/time.ts
export function getCurrentTime(headers: Headers): Date {
  if (process.env.TEST_MODE === '1') {
    const testNowMs = headers.get('x-test-now-ms');
    if (testNowMs) {
      return new Date(parseInt(testNowMs, 10));
    }
  }
  return new Date();
}

export function calculateExpiresAt(ttlSeconds: number, now: Date): Date {
  return new Date(now.getTime() + ttlSeconds * 1000);
}

export function isPasteExpired(expiresAt: Date | null, now: Date): boolean {
  if (!expiresAt) return false;
  return now >= expiresAt;
}
```

**Design Rationale:**
- Centralized time logic for consistency
- TEST_MODE support isolated to one module
- Pure functions for testability

### 3. Validation Layer

```typescript
// src/lib/validation.ts
export interface CreatePasteInput {
  content: string;
  ttl_seconds?: number;
  max_views?: number;
}

export interface ValidationError {
  error: string;
  details?: string[];
}

export function validateCreatePaste(input: unknown): 
  { valid: true; data: CreatePasteInput } | 
  { valid: false; error: ValidationError } {
  
  // Validation logic:
  // 1. Check content exists and is non-empty string
  // 2. Check ttl_seconds is integer >= 1 if present
  // 3. Check max_views is integer >= 1 if present
  // Return structured error or validated data
}
```

**Design Rationale:**
- Type-safe validation with discriminated unions
- Centralized validation rules
- Detailed error messages for debugging

### 4. Paste Service Layer

```typescript
// src/lib/paste-service.ts
export interface PasteResponse {
  id: string;
  url: string;
}

export interface PasteFetchResponse {
  content: string;
  remaining_views: number | null;
  expires_at: string | null;
}

export async function createPaste(
  content: string,
  ttlSeconds: number | undefined,
  maxViews: number | undefined,
  now: Date
): Promise<PasteResponse> {
  // Create paste with calculated expiresAt
  // Return id and constructed URL
}

export async function fetchPaste(
  id: string,
  now: Date
): Promise<PasteFetchResponse | null> {
  // Transaction:
  // 1. Find paste
  // 2. Check if expired (time or views)
  // 3. Increment viewCount atomically
  // 4. Return data or null if unavailable
}

export async function getPasteContent(
  id: string,
  now: Date
): Promise<string | null> {
  // Similar to fetchPaste but returns only content
  // Used by HTML view route
}
```

**Design Rationale:**
- Business logic separated from route handlers
- Transactions ensure atomic view counting
- Service layer handles expiry logic consistently
- Returns null for unavailable pastes (404 handling in routes)

### 5. API Routes

#### Health Check (`/api/healthz`)

```typescript
export async function GET() {
  try {
    // Test database connection with simple query
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    return Response.json({ ok: false }, { status: 500 });
  }
}
```

#### Create Paste (`POST /api/pastes`)

```typescript
export async function POST(request: Request) {
  const body = await request.json();
  const validation = validateCreatePaste(body);
  
  if (!validation.valid) {
    return Response.json(validation.error, { status: 400 });
  }
  
  const now = getCurrentTime(request.headers);
  const result = await createPaste(
    validation.data.content,
    validation.data.ttl_seconds,
    validation.data.max_views,
    now
  );
  
  return Response.json(result, { status: 201 });
}
```

#### Fetch Paste (`GET /api/pastes/:id`)

```typescript
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const now = getCurrentTime(request.headers);
  const paste = await fetchPaste(params.id, now);
  
  if (!paste) {
    return Response.json(
      { error: 'Paste not found or expired' },
      { status: 404 }
    );
  }
  
  return Response.json(paste, { status: 200 });
}
```

### 6. HTML Pages

#### Home Page (`/`)

- Simple form with:
  - Textarea for content (required)
  - Number input for TTL seconds (optional)
  - Number input for max views (optional)
  - Submit button
- Client-side form submission to `/api/pastes`
- Display created paste URL on success
- Display error messages on failure

#### View Paste Page (`/p/:id`)

```typescript
export default async function ViewPastePage({
  params,
}: {
  params: { id: string };
}) {
  const now = new Date(); // Server-side, always use real time
  const content = await getPasteContent(params.id, now);
  
  if (!content) {
    notFound(); // Next.js 404 page
  }
  
  return (
    <div>
      <pre>{content}</pre> {/* Safe text rendering */}
    </div>
  );
}
```

**Design Rationale:**
- Server components for HTML routes (no TEST_MODE support needed)
- `<pre>` tag for safe text rendering (no HTML interpretation)
- Next.js `notFound()` for 404 handling

## Data Models

### Paste Entity

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | String | No | cuid() | Unique identifier |
| content | String | No | - | Paste text content |
| createdAt | DateTime | No | now() | Creation timestamp |
| expiresAt | DateTime | Yes | null | Expiration timestamp |
| maxViews | Int | Yes | null | Maximum view limit |
| viewCount | Int | No | 0 | Current view count |

### API Request/Response Models

#### CreatePasteRequest
```typescript
{
  content: string;
  ttl_seconds?: number;  // >= 1
  max_views?: number;    // >= 1
}
```

#### CreatePasteResponse
```typescript
{
  id: string;
  url: string;  // "http://localhost:3000/p/<id>"
}
```

#### FetchPasteResponse
```typescript
{
  content: string;
  remaining_views: number | null;  // null if unlimited
  expires_at: string | null;       // ISO 8601 or null
}
```

#### ErrorResponse
```typescript
{
  error: string;
  details?: string[];
}
```

## Error Handling

### Error Categories

1. **Validation Errors (400)**
   - Missing required fields
   - Invalid data types
   - Out-of-range values
   - Response: JSON with error details

2. **Not Found Errors (404)**
   - Non-existent paste ID
   - Expired paste (TTL)
   - View limit exceeded
   - Response: JSON for API, HTML for web pages

3. **Server Errors (500)**
   - Database connection failures
   - Unexpected exceptions
   - Response: JSON with generic error message

### Error Handling Strategy

```typescript
// API routes: Always return JSON
try {
  // Operation
} catch (error) {
  console.error('Error:', error);
  return Response.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

// HTML routes: Use Next.js error boundaries
// - notFound() for 404s
// - error.tsx for 500s
```

## Concurrency and Race Conditions

### Problem: Concurrent View Counting

Multiple simultaneous requests to the same paste could cause:
- View count exceeding maxViews
- Incorrect remaining_views calculation
- Serving expired pastes

### Solution: Database Transactions

```typescript
export async function fetchPaste(id: string, now: Date) {
  return await prisma.$transaction(async (tx) => {
    // 1. Lock and read paste
    const paste = await tx.paste.findUnique({
      where: { id },
    });
    
    if (!paste) return null;
    
    // 2. Check expiry
    if (isPasteExpired(paste.expiresAt, now)) {
      return null;
    }
    
    // 3. Check view limit BEFORE incrementing
    if (paste.maxViews !== null && paste.viewCount >= paste.maxViews) {
      return null;
    }
    
    // 4. Increment view count atomically
    const updated = await tx.paste.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    
    // 5. Calculate remaining views
    const remainingViews = paste.maxViews !== null
      ? Math.max(0, paste.maxViews - updated.viewCount)
      : null;
    
    return {
      content: paste.content,
      remaining_views: remainingViews,
      expires_at: paste.expiresAt?.toISOString() ?? null,
    };
  });
}
```

**Design Rationale:**
- Transaction ensures atomicity
- Check-then-increment pattern prevents exceeding maxViews
- SQLite's default isolation level (SERIALIZABLE) prevents race conditions
- Math.max(0, ...) ensures remaining_views never goes negative

## Testing Strategy

### Unit Tests

1. **Time Utilities**
   - getCurrentTime with/without TEST_MODE
   - calculateExpiresAt calculations
   - isPasteExpired edge cases

2. **Validation**
   - Valid inputs pass
   - Invalid inputs rejected with correct errors
   - Edge cases (empty strings, zero values, non-integers)

3. **Paste Service**
   - createPaste generates valid IDs and URLs
   - fetchPaste handles all expiry scenarios
   - Concurrent access doesn't violate constraints

### Integration Tests

1. **API Endpoints**
   - Health check returns 200 with correct JSON
   - Create paste with various input combinations
   - Fetch paste decrements remaining views correctly
   - 404 responses for unavailable pastes

2. **Expiry Logic**
   - TTL expiry using TEST_MODE
   - View limit expiry
   - Combined TTL and view limit (first wins)

3. **Concurrency**
   - Parallel requests don't exceed maxViews
   - View count remains accurate under load

### End-to-End Tests

1. **User Flows**
   - Create paste → view paste → verify content
   - Create paste with TTL → wait → verify 404
   - Create paste with max_views=1 → view twice → verify 404

### Test Data Strategy

- Use TEST_MODE=1 for deterministic time-based tests
- Create isolated test database for each test suite
- Clean up test data after each test

## Security Considerations

### XSS Prevention

- HTML view uses `<pre>` tag for text rendering
- No `dangerouslySetInnerHTML` usage
- Content treated as plain text, not HTML

### Input Validation

- All API inputs validated before processing
- Type checking with TypeScript
- Runtime validation for user inputs

### SQL Injection Prevention

- Prisma ORM parameterizes all queries
- No raw SQL with user input

### Rate Limiting

- Not implemented (out of scope per specification)
- Could be added later with middleware

## Performance Considerations

### Database Optimization

- Primary key index on `id` (automatic)
- Consider index on `expiresAt` for cleanup queries (future)
- SQLite sufficient for moderate traffic

### Caching Strategy

- Not implemented (out of scope)
- Pastes are mutable (view count changes)
- Caching would complicate concurrency

### Scalability Limitations

- SQLite limits concurrent writes
- Single-server deployment
- For production: migrate to PostgreSQL with connection pooling

## Deployment and Configuration

### Environment Variables

```env
# Database
DATABASE_URL="file:./dev.db"

# Testing
TEST_MODE=0

# Next.js
NODE_ENV=development
```

### Development Setup

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### Production Considerations (Out of Scope)

- Not required per specification
- Would need: HTTPS, domain configuration, process manager, monitoring

## Open Questions and Future Enhancements

### Out of Scope (Per Specification)

- User authentication
- Syntax highlighting
- Additional endpoints
- Deployment configuration
- Rate limiting
- Paste editing/deletion
- Analytics

### Potential Future Features

- Paste cleanup job (delete expired pastes)
- Paste statistics
- Custom URLs
- Password protection
- Syntax highlighting for code
- API rate limiting
