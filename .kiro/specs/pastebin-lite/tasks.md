# Implementation Plan

- [x] 1. Initialize Next.js project and configure dependencies





  - Create Next.js project with TypeScript and App Router
  - Install Prisma, configure SQLite database
  - Set up project structure (src/app, src/lib, src/types directories)
  - Configure TypeScript with strict mode
  - Create .env file with DATABASE_URL and TEST_MODE variables
  - _Requirements: 7.1, 7.8_

- [x] 2. Set up Prisma schema and database






  - [x] 2.1 Define Paste model in schema.prisma

    - Create Paste model with id (String, @id, @default(cuid()))
    - Add content field (String)
    - Add createdAt field (DateTime, @default(now()))
    - Add expiresAt field (DateTime, nullable)
    - Add maxViews field (Int, nullable)
    - Add viewCount field (Int, @default(0))
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  

  - [x] 2.2 Create Prisma client singleton

    - Implement db.ts with singleton pattern
    - Handle development hot-reload with global reference
    - _Requirements: 7.1, 7.8_
  

  - [x] 2.3 Initialize database

    - Run prisma generate to create client
    - Run prisma db push to create database schema
    - _Requirements: 7.1, 7.8_

- [x] 3. Implement time utilities with TEST_MODE support






  - [x] 3.1 Create time.ts utility module

    - Implement getCurrentTime function that reads x-test-now-ms header when TEST_MODE=1
    - Implement calculateExpiresAt function for TTL calculations
    - Implement isPasteExpired function for expiry checks
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  

  - [x] 3.2 Write unit tests for time utilities

    - Test getCurrentTime with and without TEST_MODE
    - Test calculateExpiresAt with various TTL values
    - Test isPasteExpired with past, future, and null dates
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4. Implement validation layer



  - [x] 4.1 Create validation.ts module
    - Define CreatePasteInput interface
    - Define ValidationError interface
    - Implement validateCreatePaste function
    - Validate content is non-empty string
    - Validate ttl_seconds is integer >= 1 if present
    - Validate max_views is integer >= 1 if present
    - Return discriminated union (valid/invalid)
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  
  - [x] 4.2 Write unit tests for validation
    - Test valid inputs pass validation
    - Test missing content returns error
    - Test empty content returns error
    - Test invalid ttl_seconds values
    - Test invalid max_views values
    - Test non-integer values
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 5. Implement paste service layer with atomic operations
  - [x] 5.1 Create paste-service.ts module
    - Define PasteResponse and PasteFetchResponse interfaces
    - Implement createPaste function
    - Calculate expiresAt from ttl_seconds using time utilities
    - Generate paste ID and construct URL
    - _Requirements: 2.1, 2.2, 2.9, 2.10_
  
  - [x] 5.2 Implement fetchPaste with transaction
    - Use Prisma transaction for atomic operations
    - Find paste by ID
    - Check if paste is expired by time
    - Check if paste has reached maxViews limit
    - Increment viewCount atomically
    - Calculate remaining_views (null if unlimited, never negative)
    - Return paste data or null if unavailable
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.10, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.1, 8.2, 8.3, 8.4_
  
  - [x] 5.3 Implement getPasteContent for HTML view
    - Similar logic to fetchPaste but returns only content string
    - Use transaction to increment view count
    - Check expiry constraints
    - Return null if unavailable
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6_
  
  - [x] 5.4 Write unit tests for paste service
    - Test createPaste generates valid ID and URL
    - Test fetchPaste increments view count
    - Test fetchPaste returns null for expired pastes
    - Test fetchPaste returns null when maxViews reached
    - Test remaining_views calculation
    - Test concurrent access doesn't exceed maxViews
    - _Requirements: 3.1, 3.2, 5.1, 5.2, 5.3, 8.1, 8.3, 8.4_

- [x] 6. Implement health check API endpoint
  - [x] 6.1 Create /api/healthz/route.ts
    - Implement GET handler
    - Test database connectivity with simple query
    - Return { ok: true } with status 200 on success
    - Handle errors gracefully
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 6.2 Write integration test for health check
    - Test returns 200 status
    - Test returns correct JSON shape
    - Test verifies database connectivity
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 7. Implement create paste API endpoint
  - [x] 7.1 Create /api/pastes/route.ts
    - Implement POST handler
    - Parse request JSON body
    - Validate input using validation layer
    - Return 400 with JSON error for invalid input
    - Get current time using time utilities (TEST_MODE support)
    - Call createPaste service function
    - Return 201 with id and url on success
    - Handle errors and return appropriate status codes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 9.1, 9.2, 9.4_
  
  - [x] 7.2 Write integration tests for create paste
    - Test valid paste creation returns 201
    - Test response contains id and url
    - Test missing content returns 400
    - Test empty content returns 400
    - Test invalid ttl_seconds returns 400
    - Test invalid max_views returns 400
    - Test paste with TTL stores correct expiresAt
    - Test paste with maxViews stores correct limit
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

- [x] 8. Implement fetch paste API endpoint
  - [x] 8.1 Create /api/pastes/[id]/route.ts
    - Implement GET handler with dynamic route parameter
    - Get current time using time utilities (TEST_MODE support)
    - Call fetchPaste service function
    - Return 404 with JSON error if paste is null
    - Return 200 with content, remaining_views, and expires_at on success
    - Format expires_at as ISO 8601 string or null
    - Handle errors appropriately
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 9.3, 9.4_
  
  - [x] 8.2 Write integration tests for fetch paste
    - Test successful fetch returns 200 with correct data
    - Test view count increments on each fetch
    - Test remaining_views decrements correctly
    - Test remaining_views is null for unlimited pastes
    - Test expires_at is null for pastes without TTL
    - Test expires_at is ISO 8601 string for pastes with TTL
    - Test non-existent paste returns 404
    - Test expired paste returns 404
    - Test paste at maxViews limit returns 404
    - Test concurrent requests don't exceed maxViews
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [x] 9. Implement HTML view paste page
  - [x] 9.1 Create /p/[id]/page.tsx
    - Implement async Server Component
    - Get paste content using getPasteContent service function
    - Use real system time (not TEST_MODE) for server components
    - Call Next.js notFound() if paste is null
    - Render paste content safely in <pre> tag
    - Add basic styling for readability
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 9.2 Write integration tests for HTML view
    - Test available paste returns 200 with HTML
    - Test content is rendered in response
    - Test non-existent paste returns 404
    - Test expired paste returns 404
    - Test paste at maxViews returns 404
    - Test content is safely rendered (no script execution)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 10. Implement home page with create paste form
  - [x] 10.1 Create root layout (app/layout.tsx)
    - Set up HTML structure
    - Add basic global styles
    - Configure metadata
    - _Requirements: 10.1_
  
  - [x] 10.2 Create home page (app/page.tsx)
    - Create form with textarea for content
    - Add optional number input for TTL seconds
    - Add optional number input for max views
    - Add submit button
    - Implement client-side form submission to /api/pastes
    - Display created paste URL on success
    - Display error messages on failure
    - Add basic styling for usability
    - _Requirements: 10.1, 10.3, 10.4_
  
  - [x] 10.3 Write E2E tests for create flow
    - Test form submission creates paste
    - Test paste URL is displayed
    - Test clicking URL navigates to paste view
    - Test error messages display on invalid input
    - _Requirements: 10.1, 10.3, 10.4_

- [x] 11. Add error handling and edge cases
  - [x] 11.1 Create error.tsx for server errors
    - Handle unexpected errors in app
    - Display user-friendly error message
    - _Requirements: 9.5_
  
  - [x] 11.2 Create not-found.tsx for 404 pages
    - Display user-friendly 404 message
    - _Requirements: 9.3_
  
  - [x] 11.3 Add try-catch blocks in all route handlers
    - Catch unexpected errors
    - Return appropriate JSON error responses
    - Log errors for debugging
    - _Requirements: 9.1, 9.2, 9.4_

- [x] 12. Final integration and verification
  - [x] 12.1 Verify all API routes follow specification
    - Test health check endpoint
    - Test create paste with various inputs
    - Test fetch paste with expiry scenarios
    - Verify exact response shapes and status codes
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.7, 3.8, 3.9_
  
  - [x] 12.2 Verify HTML routes work correctly
    - Test home page form submission
    - Test paste view page rendering
    - Test 404 handling
    - _Requirements: 4.1, 4.4, 10.1_
  
  - [x] 12.3 Test deterministic time handling
    - Set TEST_MODE=1
    - Send requests with x-test-now-ms header
    - Verify TTL expiry works with controlled time
    - Verify system falls back to real time without header
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 12.4 Test data persistence
    - Create paste
    - Restart application
    - Verify paste still accessible
    - _Requirements: 7.8_
  
  - [x] 12.5 Run full test suite
    - Execute all unit tests
    - Execute all integration tests
    - Execute all E2E tests
    - Verify 100% requirement coverage
    - _Requirements: All_
