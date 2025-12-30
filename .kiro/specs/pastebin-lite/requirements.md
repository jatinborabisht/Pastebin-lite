# Requirements Document

## Introduction

Pastebin-Lite is a web application that allows users to create text pastes and share them via URLs. Pastes can expire based on time-to-live (TTL) or view count limits. The system uses Next.js with App Router, TypeScript, SQLite with Prisma ORM for persistent storage, and runs on Node runtime.

## Glossary

- **Paste**: A text content entry stored in the system with optional expiry constraints
- **TTL (Time-To-Live)**: The duration in seconds after which a paste expires
- **View Count**: The number of times a paste has been accessed
- **Max Views**: The maximum number of views allowed before a paste becomes unavailable
- **Pastebin System**: The complete web application including API and UI components
- **TEST_MODE**: An environment variable flag that enables deterministic time handling for testing
- **Atomic Operation**: A database operation that completes entirely or not at all, preventing race conditions

## Requirements

### Requirement 1: Health Check Endpoint

**User Story:** As a system administrator, I want a health check endpoint, so that I can verify the application and database are operational.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/healthz, THE Pastebin System SHALL return HTTP status code 200
2. WHEN a GET request is made to /api/healthz, THE Pastebin System SHALL return a JSON response containing the property "ok" with value true
3. WHEN a GET request is made to /api/healthz, THE Pastebin System SHALL verify database connectivity before responding
4. WHEN a GET request is made to /api/healthz, THE Pastebin System SHALL respond within 5 seconds

### Requirement 2: Create Paste

**User Story:** As a user, I want to create a text paste with optional expiry constraints, so that I can share content with others under controlled conditions.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/pastes with valid content, THE Pastebin System SHALL create a new paste and return HTTP status code in the 2xx range
2. WHEN a POST request is made to /api/pastes with valid content, THE Pastebin System SHALL return a JSON response containing "id" as a string and "url" as a string in the format "http://localhost:3000/p/<id>"
3. WHEN a POST request is made to /api/pastes without a content field, THE Pastebin System SHALL return HTTP status code in the 4xx range with a JSON error body
4. WHEN a POST request is made to /api/pastes with an empty string as content, THE Pastebin System SHALL return HTTP status code in the 4xx range with a JSON error body
5. WHEN a POST request is made to /api/pastes with ttl_seconds less than 1, THE Pastebin System SHALL return HTTP status code in the 4xx range with a JSON error body
6. WHEN a POST request is made to /api/pastes with max_views less than 1, THE Pastebin System SHALL return HTTP status code in the 4xx range with a JSON error body
7. WHEN a POST request is made to /api/pastes with ttl_seconds as a non-integer, THE Pastebin System SHALL return HTTP status code in the 4xx range with a JSON error body
8. WHEN a POST request is made to /api/pastes with max_views as a non-integer, THE Pastebin System SHALL return HTTP status code in the 4xx range with a JSON error body
9. WHEN a POST request is made to /api/pastes with valid content and valid ttl_seconds, THE Pastebin System SHALL store the paste with an expiration timestamp calculated from the current time plus ttl_seconds
10. WHEN a POST request is made to /api/pastes with valid content and valid max_views, THE Pastebin System SHALL store the paste with the specified max_views limit

### Requirement 3: Fetch Paste via API

**User Story:** As an API consumer, I want to retrieve paste content and metadata via API, so that I can programmatically access paste information.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/pastes/:id for an existing available paste, THE Pastebin System SHALL return HTTP status code 200 with JSON containing "content", "remaining_views", and "expires_at" properties
2. WHEN a GET request is made to /api/pastes/:id for an existing available paste, THE Pastebin System SHALL increment the view count by exactly one
3. WHEN a GET request is made to /api/pastes/:id for a paste with no max_views limit, THE Pastebin System SHALL return "remaining_views" as null
4. WHEN a GET request is made to /api/pastes/:id for a paste with no TTL, THE Pastebin System SHALL return "expires_at" as null
5. WHEN a GET request is made to /api/pastes/:id for a paste with max_views limit, THE Pastebin System SHALL return "remaining_views" as an integer representing views remaining after this request
6. WHEN a GET request is made to /api/pastes/:id for a paste with TTL, THE Pastebin System SHALL return "expires_at" as an ISO 8601 formatted timestamp string
7. WHEN a GET request is made to /api/pastes/:id for a non-existent paste, THE Pastebin System SHALL return HTTP status code 404 with a JSON error body
8. WHEN a GET request is made to /api/pastes/:id for an expired paste, THE Pastebin System SHALL return HTTP status code 404 with a JSON error body
9. WHEN a GET request is made to /api/pastes/:id for a paste that has reached its max_views limit, THE Pastebin System SHALL return HTTP status code 404 with a JSON error body
10. WHEN a GET request is made to /api/pastes/:id, THE Pastebin System SHALL perform view count updates atomically to prevent race conditions

### Requirement 4: View Paste via HTML

**User Story:** As a user, I want to view paste content in a web browser, so that I can read shared content easily.

#### Acceptance Criteria

1. WHEN a GET request is made to /p/:id for an existing available paste, THE Pastebin System SHALL return HTTP status code 200 with HTML content
2. WHEN a GET request is made to /p/:id for an existing available paste, THE Pastebin System SHALL render the paste content in the HTML response
3. WHEN a GET request is made to /p/:id for an existing available paste, THE Pastebin System SHALL sanitize the paste content to prevent script execution
4. WHEN a GET request is made to /p/:id for a non-existent paste, THE Pastebin System SHALL return HTTP status code 404
5. WHEN a GET request is made to /p/:id for an expired paste, THE Pastebin System SHALL return HTTP status code 404
6. WHEN a GET request is made to /p/:id for a paste that has reached its max_views limit, THE Pastebin System SHALL return HTTP status code 404

### Requirement 5: Paste Expiry Logic

**User Story:** As a user, I want pastes to expire based on TTL or view limits, so that I can control how long content remains accessible.

#### Acceptance Criteria

1. WHEN a paste has a TTL and the current time exceeds the expiration timestamp, THE Pastebin System SHALL treat the paste as unavailable
2. WHEN a paste has a max_views limit and the view count reaches max_views, THE Pastebin System SHALL treat the paste as unavailable
3. WHEN a paste has both TTL and max_views constraints and either constraint is violated, THE Pastebin System SHALL treat the paste as unavailable
4. WHEN checking paste availability, THE Pastebin System SHALL verify expiry constraints before serving the paste
5. WHEN incrementing view count, THE Pastebin System SHALL ensure the remaining_views value never becomes negative
6. WHEN a paste becomes unavailable due to reaching max_views, THE Pastebin System SHALL prevent the view count from exceeding max_views

### Requirement 6: Deterministic Time Handling

**User Story:** As a test engineer, I want to control the system time during tests, so that I can verify time-based expiry logic deterministically.

#### Acceptance Criteria

1. WHEN the environment variable TEST_MODE is set to "1" and a request includes the x-test-now-ms header, THE Pastebin System SHALL use the header value as the current time for expiry calculations
2. WHEN the environment variable TEST_MODE is set to "1" and a request does not include the x-test-now-ms header, THE Pastebin System SHALL use the real system time
3. WHEN the environment variable TEST_MODE is not set to "1", THE Pastebin System SHALL use the real system time regardless of request headers
4. WHEN using the x-test-now-ms header value, THE Pastebin System SHALL interpret the value as milliseconds since Unix epoch

### Requirement 7: Database Schema

**User Story:** As a developer, I want a well-defined database schema, so that paste data is stored consistently and reliably.

#### Acceptance Criteria

1. THE Pastebin System SHALL use Prisma ORM with SQLite for data persistence
2. THE Pastebin System SHALL define a Paste model with an "id" field as a string primary key
3. THE Pastebin System SHALL define a Paste model with a "content" field as a string
4. THE Pastebin System SHALL define a Paste model with a "createdAt" field as a Date
5. THE Pastebin System SHALL define a Paste model with an "expiresAt" field as a nullable Date
6. THE Pastebin System SHALL define a Paste model with a "maxViews" field as a nullable integer
7. THE Pastebin System SHALL define a Paste model with a "viewCount" field as an integer with default value 0
8. THE Pastebin System SHALL persist paste data to disk such that data survives application restarts

### Requirement 8: Concurrency Safety

**User Story:** As a system architect, I want concurrent access to be handled safely, so that data integrity is maintained under load.

#### Acceptance Criteria

1. WHEN multiple concurrent requests attempt to increment the view count for the same paste, THE Pastebin System SHALL ensure each increment is atomic
2. WHEN incrementing view count, THE Pastebin System SHALL re-check expiry constraints within the transaction
3. WHEN a paste reaches its max_views limit, THE Pastebin System SHALL ensure the view count does not exceed max_views even under concurrent access
4. WHEN handling concurrent requests, THE Pastebin System SHALL prevent race conditions that could lead to incorrect view counts

### Requirement 9: Error Handling

**User Story:** As an API consumer, I want consistent error responses, so that I can handle errors appropriately in my application.

#### Acceptance Criteria

1. WHEN invalid input is provided to an API endpoint, THE Pastebin System SHALL return an HTTP status code in the 4xx range
2. WHEN invalid input is provided to an API endpoint, THE Pastebin System SHALL return a JSON response body containing error information
3. WHEN a paste is unavailable, THE Pastebin System SHALL return HTTP status code 404
4. WHEN an error occurs in an API route, THE Pastebin System SHALL return a JSON response
5. WHEN an error occurs in an HTML route, THE Pastebin System SHALL return an HTML response

### Requirement 10: User Interface

**User Story:** As a user, I want simple web pages to create and view pastes, so that I can use the application without additional tools.

#### Acceptance Criteria

1. THE Pastebin System SHALL provide a web page with a form to create a new paste
2. THE Pastebin System SHALL provide a web page to view an existing paste
3. WHEN an error occurs in the UI, THE Pastebin System SHALL display a clear error message to the user
4. THE Pastebin System SHALL allow users to specify optional TTL and max_views constraints when creating a paste
