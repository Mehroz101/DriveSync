# Authentication Stabilization Initiative

## Executive Summary

This design establishes a comprehensive plan to stabilize and secure the authentication system across DriveSync, addressing critical architectural flaws that compromise security, user experience, and data integrity. The platform currently suffers from inconsistent token handling, frontend-controlled user context, and fragmented authentication flows that create vulnerabilities and prevent reliable multi-account Drive integration.

## Problem Statement

### Current Architecture Issues

#### Critical Security Vulnerabilities

**Frontend-Driven User Context**
- User identity is derived from localStorage userId rather than cryptographically verified tokens
- Protected API endpoints accept userId as URL parameters without validating against authenticated token
- Any authenticated user can access another user's data by manipulating URL parameters
- Authorization bypass vulnerability exists across all protected routes

**Inconsistent Authentication State**
- Two parallel authentication systems (Google OAuth and email/password) with divergent token handling
- Google OAuth flow stores userId in localStorage after callback
- Email authentication returns JWT but frontend still relies on localStorage userId
- Token validation occurs but userId parameter takes precedence in business logic

**Token Management Gaps**
- JWT tokens generated but not consistently used for user resolution
- Backend middleware validates tokens and attaches userId to request but controllers ignore it
- No token refresh mechanism implemented
- Token expiration handled inconsistently between authentication methods

#### Architectural Defects

**Dual Identity Resolution**
- Backend authenticateToken middleware extracts userId from JWT and attaches to request object
- Controllers immediately override this by reading userId from URL parameters
- Authenticated request context is bypassed in favor of untrusted client input

**Mixed Authentication Patterns**
- Google OAuth uses session-based flow with passport serialization
- Email authentication uses stateless JWT approach
- Routes inconsistently apply authentication middleware
- No unified authentication contract across endpoints

**Multi-Drive Account Integration Fragility**
- Drive account linking flow depends on passing userId through OAuth state parameter
- No validation that the requesting user owns the userId being passed
- DriveAccount model correctly associates with userId but API layer allows cross-user access
- File and profile APIs query by untrusted userId parameter rather than authenticated session

### Impact Assessment

**Security Risks**
- Horizontal privilege escalation: authenticated users can access any other user's Drive accounts
- Data leakage: files, profiles, and account information exposed across user boundaries
- Account hijacking: attackers can manipulate API calls to link Drive accounts to wrong users

**User Experience Issues**
- Login and registration flows may fail silently due to token/userId mismatch
- Session state unreliable after page refresh
- Logout doesn't properly clear authentication context
- Multi-drive connections may attach to incorrect user accounts

**Operational Concerns**
- Debugging authentication issues complicated by multiple state sources
- Audit trails compromised when userId is client-controlled
- Scaling concerns with session-based OAuth alongside stateless JWT

## Solution Design

### Phase 1: Core Authentication Remediation

#### Objective
Establish a unified, token-based authentication foundation that eliminates frontend-controlled identity and ensures all user context derives from cryptographically verified credentials.

#### Token-Centric User Resolution

**Backend Authentication Middleware Enhancement**

Extend existing authenticateToken middleware to become the single source of truth for user identity across all protected routes.

Current middleware already performs:
- Token extraction from Authorization header
- JWT verification using secret key
- User existence validation against database
- Request object augmentation with userId and userEmail

Enhancement required:
- Make middleware mandatory on all protected routes
- Remove optional or conditional middleware application
- Standardize AuthenticatedRequest interface usage across all controllers

**Controller Refactoring**

All controllers must transition from parameter-based to token-based user resolution.

Current pattern to eliminate:
- Controllers accept userId as URL parameter
- Direct parameter usage without cross-validation against token
- Explicit parameter extraction in route handlers

Target pattern:
- Controllers access userId exclusively from request.userId (populated by middleware)
- URL parameters removed from user-scoped endpoints
- Request object becomes single source of authenticated identity

**Route Structure Transformation**

Authentication-required endpoints must shift from user-parameterized to token-implied patterns.

| Current Pattern | Target Pattern | Scope |
|----------------|----------------|-------|
| GET /api/drive/files/:userId | GET /api/drive/files | Retrieve authenticated user's files |
| GET /api/drive/accounts/:userId | GET /api/drive/accounts | List authenticated user's Drive accounts |
| POST /api/drive/sync/:userId | POST /api/drive/sync | Sync authenticated user's accounts |
| GET /api/auth/profile/:userId | GET /api/auth/profile | Get authenticated user profile |
| DELETE /api/drive/accounts/:accountId | DELETE /api/drive/accounts/:accountId | Verify ownership before deletion |

**Ownership Validation Pattern**

For resources identified by their own ID (e.g., accountId, fileId), implement ownership verification before permitting operations.

Standard verification flow:
- Extract resource identifier from URL parameter
- Retrieve resource from database
- Compare resource.userId against request.userId from token
- Return 403 Forbidden if ownership validation fails
- Proceed with operation only if ownership confirmed

#### Email Authentication Flow Hardening

**Registration Security**

Current implementation provides basic user creation with password hashing and duplicate email checking. Enhancement focuses on validation and error handling.

Validation requirements:
- Email format validation using industry-standard regex patterns
- Password complexity enforcement (minimum length, character requirements)
- Name field sanitization to prevent injection attacks
- Rate limiting on registration endpoint to prevent abuse

Error handling improvements:
- Distinguish between validation errors and system failures
- Avoid leaking user enumeration through error messages
- Consistent error response structure across authentication endpoints

**Login Security**

Current implementation checks credentials and returns JWT. Enhancement adds security controls and session management.

Security controls:
- Account lockout after failed login attempts (configurable threshold)
- Timing-safe password comparison to prevent timing attacks
- Login attempt logging for security monitoring
- IP-based rate limiting to prevent brute force attacks

Token management:
- Include additional claims in JWT (issued at, expiration, token ID)
- Implement token versioning to enable bulk invalidation
- Add remember-me functionality with extended expiration
- Consider refresh token implementation for long-lived sessions

**Password Management**

Currently missing critical user self-service capabilities.

Required functionality:
- Password reset flow using time-limited tokens sent via email
- Password change for authenticated users with old password verification
- Password history to prevent reuse of recent passwords
- Secure token generation using cryptographic random sources

#### Frontend Authentication State

**Token-First Architecture**

Frontend must transition to JWT-centric authentication state management, eliminating localStorage userId dependency.

Token storage:
- JWT stored in localStorage or httpOnly cookie (security consideration)
- userId removed from localStorage entirely
- User information derived from JWT decoding or profile API call
- No client-side state except token

**User Context Resolution**

Application requires current user information for UI personalization and API calls.

Resolution strategy:
- Decode JWT client-side to extract userId and email (non-sensitive claims)
- Call GET /api/auth/profile with token to fetch full user object
- Cache user profile in React state or context
- Refresh user profile on token refresh or explicit user action

**Authentication State Management**

Centralized authentication state improves consistency and developer experience.

Implementation approach:
- Create AuthContext using React Context API
- Provide hooks: useAuth, useUser, useLogout
- Manage token lifecycle within context
- Handle token expiration and refresh automatically
- Redirect to login on authentication failures

**Axios Interceptor Enhancement**

Current axios client adds Authorization header from localStorage token. Enhancement required for error handling.

Interceptor responsibilities:
- Attach token to all API requests automatically
- Handle 401 responses by clearing state and redirecting to login
- Handle 403 responses by showing permission denied message
- Optionally implement token refresh on 401 for expired tokens

### Phase 2: Token-Driven Identity Management

#### Objective
Enforce token-based user resolution across all protected APIs, eliminating any dependency on client-supplied user identifiers and ensuring consistent security posture.

#### Middleware Application Strategy

**Route Protection Matrix**

Define which routes require authentication and apply middleware systematically.

| Route Path | Authentication Required | Middleware Applied | User Resolution |
|-----------|------------------------|-------------------|-----------------|
| POST /api/auth/register | No | None | N/A |
| POST /api/auth/login | No | None | N/A |
| GET /api/auth/profile | Yes | authenticateToken | request.userId |
| POST /api/auth/logout | Optional | authenticateToken (optional) | request.userId |
| GET /api/drive/files | Yes | authenticateToken | request.userId |
| GET /api/drive/accounts | Yes | authenticateToken | request.userId |
| POST /api/drive/accounts | Yes | authenticateToken | request.userId |
| DELETE /api/drive/accounts/:accountId | Yes | authenticateToken | request.userId + ownership |
| POST /api/drive/sync | Yes | authenticateToken | request.userId |
| GET /api/drive/profile | Yes | authenticateToken | request.userId |
| GET /api/search/:query | Yes | authenticateToken | request.userId |

**Middleware Composition Pattern**

Express middleware should be applied at route definition time with clear composition.

Pattern for protected routes:
- Import authenticateToken middleware
- Apply to route definition before controller
- Controller receives AuthenticatedRequest type
- TypeScript enforces userId presence on request object

Pattern for ownership-required routes:
- Apply authenticateToken middleware first
- Create resource-specific ownership middleware
- Compose middleware in route definition
- Controller receives validated, owned resource

#### Controller Implementation Pattern

**Standard Protected Controller Structure**

All controllers handling authenticated requests should follow consistent pattern.

Controller function signature:
- Accept Request as AuthenticatedRequest type
- Extract userId from request.userId (guaranteed by middleware)
- Never read userId from params, query, or body
- Use userId to scope all database queries

Error handling approach:
- Middleware handles authentication failures (401)
- Controller handles authorization failures (403)
- Controller handles resource not found (404)
- Consistent error response structure

**Example Controller Transformation**

Current getDriveFiles implementation pattern:
- Accepts userId from URL parameter
- Fetches user without validating against token
- Queries DriveAccount by untrusted userId

Target getDriveFiles implementation pattern:
- Reads userId from request.userId (token-derived)
- No user existence check needed (middleware validated)
- Queries DriveAccount by authenticated userId
- Returns only files owned by authenticated user

**Ownership Validation Middleware**

Create reusable middleware for resource ownership verification.

Middleware responsibilities:
- Extract resource ID from URL parameters
- Query resource from database
- Compare resource.userId to request.userId
- Attach validated resource to request for controller use
- Return 403 if ownership validation fails

Reusability across resources:
- Create generic validateOwnership factory function
- Accept model and ID parameter name as arguments
- Return configured middleware for specific resource type
- Apply to routes requiring ownership checks

#### API Contract Standardization

**Request Interface**

All authenticated endpoints must work with extended request interface.

AuthenticatedRequest interface:
- Extends Express Request
- userId property (string, required)
- userEmail property (string, required)
- Optional user property for full user object

Controller type safety:
- Import AuthenticatedRequest from middleware module
- Type controller parameters as AuthenticatedRequest
- TypeScript ensures userId usage instead of parameters
- Compile-time validation of authentication assumptions

**Response Structure**

Standardize response formats for consistency and client parsing.

Success response structure:
- data property containing response payload
- meta property for pagination, counts, timestamps
- Consistent field naming (camelCase)

Error response structure:
- error property containing error message
- code property for application-specific error codes
- details property for validation errors or additional context
- No sensitive information in error messages

**HTTP Status Code Strategy**

Use appropriate status codes consistently across authentication scenarios.

Status code mapping:
- 200 OK: Successful operation
- 201 Created: Resource created (register, add drive account)
- 400 Bad Request: Validation error, malformed request
- 401 Unauthorized: Authentication required or token invalid
- 403 Forbidden: Authenticated but insufficient permissions
- 404 Not Found: Resource doesn't exist
- 500 Internal Server Error: Unexpected server failure

### Phase 3: Multi-Drive Account Architecture Validation

#### Objective
Ensure multi-Google-Drive linking operates securely within the token-centric authentication model, preventing cross-user account linking and data leakage.

#### OAuth State Management

**Add Drive Account Flow**

Current implementation passes userId through OAuth state parameter, creating security vulnerabilities.

Current flow weaknesses:
- Frontend constructs auth URL with userId query parameter
- Backend reads userId from query and passes through OAuth state
- No validation that requesting user owns the userId
- State parameter could be manipulated to link drive to wrong user

Secure flow design:
- Frontend calls backend API to initiate add-drive flow
- Backend reads userId from authenticated token, not parameter
- Backend generates OAuth state containing authenticated userId
- OAuth callback validates state and links drive to token-derived userId
- Frontend never supplies userId for drive linking

**OAuth State Security**

State parameter must be cryptographically protected against tampering.

State generation requirements:
- Include authenticated userId from token
- Add CSRF token to prevent replay attacks
- Sign state payload with server-side secret
- Set short expiration time for state validity

State validation requirements:
- Verify signature before extracting userId
- Check expiration timestamp
- Ensure state used only once (nonce tracking)
- Reject invalid or expired state with clear error

#### Drive Account Linking Routes

**Initiate Drive Account Addition**

Route: POST /api/drive/accounts (protected by authenticateToken)

Current implementation:
- Accepts userId as parameter
- Returns auth URL for frontend redirect

Target implementation:
- No userId parameter accepted
- Reads userId from request.userId (token)
- Generates signed OAuth state with authenticated userId
- Constructs backend OAuth initiation URL
- Returns backend URL for server-side redirect or returns redirect directly

Flow sequence:
1. Frontend calls POST /api/drive/accounts with token
2. Backend validates token and extracts userId
3. Backend generates secure state with userId
4. Backend redirects user to /auth/add-drive-account with state
5. /auth/add-drive-account initiates Google OAuth with signed state
6. Google calls back to /auth/add-drive-account/callback
7. Callback validates state, extracts userId, links drive account
8. Redirects to frontend success page

**Drive Account Callback**

Route: GET /auth/add-drive-account/callback (internal)

Current implementation:
- Extracts userId from OAuth state
- Links drive account to userId from state

Target implementation:
- Validates OAuth state signature and expiration
- Extracts userId from validated state
- Verifies userId corresponds to real user
- Creates or updates DriveAccount with proper userId association
- Ensures googleId uniqueness per user (no duplicate links)
- Redirects to frontend with success/failure indication

Security validations:
- State signature verification prevents userId tampering
- Token expiration prevents replay attacks
- Database uniqueness constraints prevent duplicate accounts
- Error handling doesn't leak sensitive information

#### Multi-Account Data Aggregation

**File Retrieval Scoping**

Current pattern: getDriveFiles accepts userId parameter and fetches all drive accounts for that user.

Vulnerability: any authenticated user can fetch files for different userId.

Secure pattern:
- getDriveFiles reads userId from request.userId only
- Queries DriveAccount collection filtered by authenticated userId
- Fetches files from Google API for each owned drive account
- Returns aggregated files with drive account attribution
- No possibility of cross-user data access

**Profile Data Scoping**

Current pattern: getMyProfile accepts userId parameter and retrieves first drive account.

Vulnerability: profile data accessible across user boundaries.

Secure pattern:
- getMyProfile reads userId from request.userId only
- Queries first DriveAccount for authenticated user
- Returns profile information only if drive account exists
- Error if no drive accounts connected (not 404 user not found)
- Profile data strictly scoped to authenticated user

**Drive Account Management**

Account listing, removal, and sync operations must respect user boundaries.

getAllDriveAccounts secure implementation:
- Query DriveAccount filtered by request.userId
- Return only accounts owned by authenticated user
- Exclude sensitive token data from response

removeDriveAccount secure implementation:
- Accept accountId as parameter (identifies specific account)
- Query DriveAccount by accountId
- Validate driveAccount.userId equals request.userId
- Only proceed with deletion if ownership confirmed
- Return 403 Forbidden if ownership validation fails

syncDriveFiles secure implementation:
- Read userId from request.userId
- Query all DriveAccount records for authenticated user
- Sync files only from owned drive accounts
- Update lastSync timestamp for processed accounts

#### Data Isolation Validation

**Database Query Patterns**

All database queries involving user data must include userId filter.

Query checklist:
- DriveAccount.find must include { userId: request.userId }
- File.find must include { userId: request.userId }
- User.findById only called with request.userId
- No queries accept userId from client request body or parameters

**Cross-User Access Prevention**

Implement defense-in-depth to prevent accidental cross-user data exposure.

Defensive measures:
- Middleware enforces token-based userId
- Controllers never accept userId from client
- Database queries always filter by authenticated userId
- Ownership validation on resource-identified operations
- Logging of authorization failures for monitoring

**Testing Strategy for Data Isolation**

Validate data isolation through systematic testing.

Test scenarios:
- User A cannot access User B's drive accounts by manipulating API calls
- User A cannot trigger sync for User B's accounts
- User A cannot view User B's files through search or direct access
- User A cannot delete User B's drive account connections
- Account linking always associates with authenticated user

### Phase 4: End-to-End Verification

#### Objective
Validate the complete authentication and authorization flow from initial login through multi-drive connection to unified data display, ensuring no security gaps or user experience issues.

#### Authentication Flow Validation

**Email Registration Flow**

End-to-end sequence:
1. User submits email, password, name to POST /api/auth/register
2. Backend validates input, checks for existing user
3. Backend hashes password, creates user record with authType='email'
4. Backend generates JWT with userId and email claims
5. Backend returns JWT and user object
6. Frontend stores JWT in localStorage (or cookie)
7. Frontend decodes JWT or calls profile API to get user info
8. Frontend redirects to dashboard
9. User authenticated and can access protected resources

Validation checkpoints:
- Registration succeeds with valid data
- Registration fails with duplicate email
- Registration fails with invalid password
- JWT generated contains correct userId
- Token can be used immediately to access protected routes
- User can access dashboard without additional login

**Email Login Flow**

End-to-end sequence:
1. User submits email and password to POST /api/auth/login
2. Backend finds user by email
3. Backend verifies authType is 'email' (not google)
4. Backend compares password hash
5. Backend generates JWT with userId and email
6. Backend returns JWT and user object
7. Frontend stores JWT
8. Frontend redirects to dashboard
9. User authenticated and can access protected resources

Validation checkpoints:
- Login succeeds with correct credentials
- Login fails with incorrect password
- Login fails for non-existent user
- Login fails for Google-authenticated users
- JWT valid and accepted by protected routes
- Session persists across page refresh

**Google OAuth Flow**

End-to-end sequence:
1. User clicks "Sign in with Google"
2. Frontend redirects to backend /auth/google
3. Backend initiates Google OAuth with required scopes
4. User authenticates with Google and grants permissions
5. Google redirects to /auth/google/callback with auth code
6. Backend exchanges code for access/refresh tokens
7. Backend finds or creates user with authType='google'
8. Backend creates or updates DriveAccount with tokens
9. Backend generates JWT for user
10. Backend redirects to frontend with userId and JWT
11. Frontend stores JWT and userId (transition: remove userId storage)
12. Frontend redirects to dashboard
13. User authenticated with first drive account connected

Validation checkpoints:
- OAuth flow completes successfully
- User record created with correct authType
- DriveAccount created with valid tokens
- JWT generated for user
- User can immediately access drive files
- First drive account automatically available

#### Token Lifecycle Validation

**Token Usage Across API Calls**

Verify token is required and validated on all protected endpoints.

Test matrix:

| Endpoint | Without Token | With Valid Token | With Expired Token | With Invalid Token |
|----------|--------------|------------------|-------------------|-------------------|
| GET /api/drive/files | 401 Unauthorized | 200 OK | 401 Unauthorized | 403 Forbidden |
| GET /api/drive/accounts | 401 Unauthorized | 200 OK | 401 Unauthorized | 403 Forbidden |
| POST /api/drive/sync | 401 Unauthorized | 200 OK | 401 Unauthorized | 403 Forbidden |
| GET /api/auth/profile | 401 Unauthorized | 200 OK | 401 Unauthorized | 403 Forbidden |

**Token Refresh Strategy**

Current implementation does not include token refresh mechanism. This section outlines optional refresh token strategy.

Refresh token approach:
- Issue both access token (short-lived, 15 minutes) and refresh token (long-lived, 7 days)
- Store refresh token securely (httpOnly cookie or secure localStorage)
- Client uses access token for API calls
- On access token expiration, client calls refresh endpoint with refresh token
- Backend validates refresh token and issues new access token
- Client updates access token and retries failed request

Without refresh tokens:
- Issue longer-lived access tokens (7 days as currently configured)
- On token expiration, user must re-authenticate
- Simpler implementation but less secure for compromised tokens
- Consider adding token revocation list for critical security events

#### Multi-Drive Connection Validation

**Adding Additional Drive Accounts**

End-to-end sequence:
1. User authenticated and viewing dashboard
2. User clicks "Add Drive Account"
3. Frontend calls POST /api/drive/accounts with JWT
4. Backend extracts userId from token (not parameter)
5. Backend redirects to /auth/add-drive-account with signed state
6. Backend initiates Google OAuth for additional account
7. User authenticates with different Google account
8. Google redirects to /auth/add-drive-account/callback
9. Backend validates state and extracts userId
10. Backend creates new DriveAccount linked to userId
11. Backend ensures googleId unique for this user
12. Backend redirects to frontend with success indication
13. Frontend refreshes drive account list
14. User sees new drive account in list

Validation checkpoints:
- Drive account addition requires authentication
- New drive account linked to authenticated user only
- Cannot add drive account to different user
- Duplicate googleId for same user prevented
- Multiple different Google accounts can be linked
- New drive account immediately available for file access

**Drive Account Ownership Validation**

Test scenarios for ownership enforcement:

Scenario 1: User A adds drive account
- User A authenticates and gets JWT
- User A adds Google Drive account X
- DriveAccount X created with userId = User A
- User A can list, sync, and remove DriveAccount X

Scenario 2: User B cannot access User A's drive account
- User B authenticates and gets different JWT
- User B calls GET /api/drive/accounts
- Response includes only User B's drive accounts, not X
- User B calls DELETE /api/drive/accounts/{X.id}
- Response is 403 Forbidden (ownership validation fails)

Scenario 3: Unauthenticated access prevented
- No JWT provided to protected endpoints
- All drive account operations return 401 Unauthorized
- No drive account information exposed

#### Unified Data Display Validation

**Cross-Account File Aggregation**

Validate that authenticated user sees files from all their connected drive accounts without cross-user leakage.

Test setup:
- User A connects Google Drive accounts X and Y
- User B connects Google Drive account Z
- Each drive contains identifiable test files

Expected behavior:
- User A calls GET /api/drive/files with their JWT
- Response includes files from drives X and Y only
- Files tagged with driveAccountName or driveAccountEmail
- User A cannot see files from drive Z

- User B calls GET /api/drive/files with their JWT
- Response includes files from drive Z only
- User B cannot see files from drives X or Y

**Search Across Accounts**

Validate search operates correctly across user's connected drives only.

Test scenarios:
- User A searches for term that matches files in drives X and Y
- Results include matches from both X and Y
- Results do not include matches from User B's drive Z
- Search results properly attributed to source drive account

- User B searches for same term
- Results include matches from drive Z only
- Results do not include User A's files

**Profile Data Display**

Validate profile information correctly scoped to authenticated user.

Test scenarios:
- User A calls GET /api/drive/profile with their JWT
- Response includes profile from first connected drive account (X or Y)
- Profile information updates on drive account re-authentication

- User B calls GET /api/drive/profile with their JWT
- Response includes profile from drive Z
- User B does not receive User A's profile data

#### Race Condition and Edge Case Testing

**Concurrent Drive Account Operations**

Test system behavior under concurrent operations.

Test scenarios:
- User adds two drive accounts simultaneously
- Both accounts successfully created without collision
- Each account has unique DriveAccount record
- No token overwrites or data corruption

- User syncs files while adding new drive account
- Sync completes for existing accounts
- New account available after OAuth completes
- No sync errors or missing files

**Token Expiration During Operation**

Test graceful handling of token expiration mid-operation.

Test scenarios:
- User initiates file sync
- Token expires during sync operation
- Request fails with 401 Unauthorized
- Frontend detects expiration and redirects to login
- User re-authenticates and can retry sync

**Drive Account Token Refresh**

Google OAuth tokens expire and need refresh. Validate refresh handling.

Test scenarios:
- DriveAccount has expired access token
- Backend attempts to fetch files from Google API
- Google API returns 401 Unauthorized
- Backend uses refresh token to obtain new access token
- Backend updates DriveAccount with new access token
- File fetch retries with new token and succeeds
- User sees files without manual re-authentication

Missing implementation:
- Current system does not implement Google token refresh
- Required: detect Google API 401 responses
- Required: call Google token refresh endpoint with stored refresh token
- Required: update DriveAccount with new tokens
- Required: retry original API call with refreshed token

#### Security Audit Checklist

**Authentication Security**

- [ ] All protected routes require valid JWT token
- [ ] Token signature verified using secure secret
- [ ] Token expiration checked and enforced
- [ ] User existence validated during token verification
- [ ] No userId accepted from URL parameters on protected routes
- [ ] All user context derived from authenticated token
- [ ] Password hashing uses bcrypt with appropriate cost factor
- [ ] Login attempts rate-limited to prevent brute force
- [ ] Sensitive routes use HTTPS in production

**Authorization Security**

- [ ] Database queries filter by authenticated userId
- [ ] Resource ownership validated before modification
- [ ] Cross-user data access prevented through query scoping
- [ ] Drive account operations check userId ownership
- [ ] File operations scoped to authenticated user's drives
- [ ] OAuth state parameter cryptographically signed
- [ ] OAuth state includes CSRF protection
- [ ] State parameter validated before drive account linking

**Data Protection**

- [ ] Passwords never stored in plain text
- [ ] JWT secret stored securely (environment variable)
- [ ] Google OAuth tokens encrypted at rest (optional enhancement)
- [ ] Sensitive data excluded from error messages
- [ ] User enumeration prevented through error message consistency
- [ ] API responses exclude sensitive token data
- [ ] Logging does not expose passwords or tokens

**Input Validation**

- [ ] Email format validated on registration and login
- [ ] Password complexity requirements enforced
- [ ] SQL injection prevented through ORM usage
- [ ] NoSQL injection prevented through input sanitization
- [ ] XSS prevented through output encoding
- [ ] CSRF protection on state-changing operations

## Implementation Phases

### Phase 1: Core Authentication Remediation

**Week 1-2: Backend Token Infrastructure**

Activities:
- Enhance authenticateToken middleware to be mandatory standard
- Refactor auth.controller to eliminate userId parameter dependencies
- Update auth.routes to remove userId from route paths
- Implement AuthenticatedRequest interface consistently
- Add input validation to registration and login endpoints
- Implement rate limiting on authentication endpoints
- Add comprehensive error handling and logging

Deliverables:
- Updated middleware with consistent token validation
- Refactored authentication controllers using token-derived userId
- Updated route definitions removing userId parameters
- Enhanced security controls on auth endpoints

**Week 3-4: Frontend Authentication State**

Activities:
- Remove localStorage userId dependency from frontend
- Update auth utility functions to use JWT-only
- Create AuthContext for centralized authentication state
- Implement useAuth, useUser hooks
- Enhance axios interceptor for automatic token handling
- Update Login and Register components to work with new flow
- Handle token expiration and redirect to login

Deliverables:
- JWT-centric authentication state management
- React context and hooks for auth state
- Updated authentication components
- Improved error handling for auth failures

### Phase 2: Token-Driven Identity Management

**Week 5-6: Protected Route Refactoring**

Activities:
- Apply authenticateToken middleware to all protected routes
- Refactor drive.controller to use request.userId
- Update getDriveFiles, getAllDriveAccounts, syncDriveFiles
- Refactor profile.controller to use request.userId
- Update route definitions to remove userId parameters
- Implement ownership validation middleware
- Apply ownership checks to resource deletion routes

Deliverables:
- All protected routes require authentication
- All controllers use token-derived userId
- Ownership validation on resource-specific operations
- Updated route definitions

**Week 7: API Contract Standardization**

Activities:
- Standardize response structures across all endpoints
- Implement consistent error response format
- Update HTTP status code usage
- Update frontend API clients to match new contracts
- Update TypeScript interfaces for request/response
- Create API documentation reflecting new contracts

Deliverables:
- Consistent API response structure
- Standardized error handling
- Updated frontend API layer
- API documentation

### Phase 3: Multi-Drive Account Architecture Validation

**Week 8-9: OAuth Flow Hardening**

Activities:
- Implement secure OAuth state generation with signing
- Refactor add-drive-account initiation to use token userId
- Update OAuth callback to validate state signature
- Implement CSRF protection in OAuth state
- Add state expiration checking
- Update frontend drive account addition flow
- Test drive account linking with multiple accounts

Deliverables:
- Cryptographically secure OAuth state management
- Token-based drive account linking
- CSRF-protected OAuth flow
- Multiple account support validated

**Week 10: Data Isolation Validation**

Activities:
- Audit all database queries for userId filtering
- Implement defense-in-depth query scoping
- Add logging for authorization failures
- Create automated tests for data isolation
- Test cross-user access prevention
- Validate file aggregation scoping
- Validate search result scoping

Deliverables:
- All queries properly scoped to authenticated user
- Automated tests for data isolation
- Authorization logging
- Validated data boundaries

### Phase 4: End-to-End Verification

**Week 11: Flow Testing**

Activities:
- Execute complete email registration and login flows
- Execute Google OAuth flow end-to-end
- Test multi-drive account addition
- Test drive account removal
- Test file sync across multiple accounts
- Test search across multiple accounts
- Validate profile retrieval

Deliverables:
- Comprehensive flow test results
- Identified and resolved edge cases
- Documented test scenarios

**Week 12: Security Audit and Hardening**

Activities:
- Execute security audit checklist
- Penetration testing for authentication bypass
- Test token manipulation attacks
- Validate OAuth state tampering prevention
- Test concurrent operations and race conditions
- Implement Google token refresh for expired DriveAccount tokens
- Address identified vulnerabilities

Deliverables:
- Completed security audit checklist
- Resolved security findings
- Token refresh implementation
- Production-ready authentication system

## Technical Specifications

### Authentication Middleware

**Interface Contract**

Middleware function signature:
- Accepts Request, Response, NextFunction from Express
- Reads Authorization header from request
- Extracts Bearer token from header
- Verifies JWT signature and expiration
- Queries User model to validate user existence
- Augments request object with userId and userEmail
- Calls next() on success
- Returns 401 or 403 error on failure

Request augmentation:
- request.userId: string (user's database _id)
- request.userEmail: string (user's email address)
- Optional: request.user (full user object)

Error responses:
- 401 Unauthorized: Token missing or expired
- 403 Forbidden: Token invalid or user not found
- 500 Internal Server Error: Unexpected error during validation

### JWT Token Structure

**Token Claims**

Standard claims:
- iat (issued at): Timestamp of token generation
- exp (expires at): Timestamp when token becomes invalid
- iss (issuer): Application identifier

Custom claims:
- userId: User's database _id (string)
- email: User's email address (string)

Token configuration:
- Algorithm: HS256 (HMAC SHA-256)
- Secret: Environment variable JWT_SECRET
- Expiration: 7 days (configurable)
- Issuer: "drivesync-api" (configurable)

### OAuth State Structure

**State Payload**

State components:
- userId: Authenticated user's database _id
- csrfToken: Randomly generated CSRF protection token
- timestamp: State generation timestamp for expiration checking
- nonce: One-time-use identifier to prevent replay

State format:
- JSON payload containing above components
- Base64-encoded for URL safety
- HMAC signature appended
- Final format: {base64Payload}.{signature}

State validation:
- Verify signature matches payload using server secret
- Check timestamp is within valid window (15 minutes)
- Verify nonce has not been used (requires nonce tracking)
- Extract userId only after validation passes

### Database Query Patterns

**User-Scoped Queries**

DriveAccount queries:
- Always include { userId: request.userId } in filter
- Never accept userId from client request
- Use MongoDB ObjectId for userId comparison

File queries:
- Always include { userId: request.userId } in filter
- Join with DriveAccount to ensure proper scoping
- Support cross-account aggregation within same user

**Ownership Validation Queries**

Resource retrieval pattern:
- Query by resource _id to retrieve full document
- Check document.userId === request.userId
- Return 403 if ownership fails
- Proceed with operation if ownership confirmed

Example for DriveAccount deletion:
- Find DriveAccount by accountId
- Verify driveAccount.userId equals request.userId
- Delete account and associated files if owned
- Return 403 Forbidden if not owned

### Error Response Format

**Standard Error Structure**

Error response body:
- error: Human-readable error message (string)
- code: Application-specific error code (string, optional)
- details: Additional context or validation errors (object, optional)

Example validation error:
```
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

Example authentication error:
```
{
  "error": "Invalid or expired token",
  "code": "AUTH_TOKEN_INVALID"
}
```

Example authorization error:
```
{
  "error": "You do not have permission to access this resource",
  "code": "FORBIDDEN"
}
```

## Migration Strategy

### Backward Compatibility

**Phased Route Transition**

To avoid breaking existing clients during migration, support both old and new routes temporarily.

Strategy:
- Deploy new token-based routes alongside existing parameterized routes
- Existing routes marked as deprecated in documentation
- Both routes share underlying service logic
- Gradually migrate frontend to new routes
- Monitor usage of deprecated routes
- Remove deprecated routes after migration window

Deprecation timeline:
- Week 1-2: Deploy new routes alongside existing
- Week 3-8: Migrate frontend components to new routes
- Week 9-10: Monitor for any remaining usage of old routes
- Week 11-12: Remove deprecated routes from backend

**Frontend Migration**

Incremental frontend updates minimize risk and enable rollback.

Migration approach:
- Update authentication state management first
- Migrate page by page to new API endpoints
- Use feature flags to toggle between old and new behavior
- Test each page thoroughly before proceeding
- Keep rollback plan ready in case of issues

### Data Migration

**Existing User Records**

Current users may have incomplete or inconsistent authType fields.

Data cleanup required:
- Audit existing User records for authType
- Set authType='google' for users with googleId
- Set authType='email' for users with password but no googleId
- Identify and handle edge cases (users with both)

**Existing Sessions**

Users with active sessions need to re-authenticate under new system.

Session invalidation strategy:
- Clear all existing session cookies
- Force token refresh for all active users
- Show informational message about re-authentication
- Preserve user data, only clear authentication state

### Rollback Planning

**Version Control Strategy**

Maintain ability to rollback authentication changes.

Git strategy:
- Each phase merged as separate feature branch
- Tag releases at phase boundaries
- Maintain backward-compatible API during migration
- Document rollback procedure for each phase

**Rollback Triggers**

Conditions that would require rollback:
- Authentication failure rate exceeds threshold (>5%)
- Unable to log in via email or Google OAuth
- Cross-user data access detected in logs
- Drive account linking failing consistently
- Performance degradation beyond acceptable limits

Rollback procedure:
- Revert to previous stable release tag
- Restore database from backup if schema changes made
- Clear authentication state for all users
- Communicate issue and resolution timeline to users

## Success Criteria

### Functional Requirements

Authentication:
- Users can register with email and password successfully
- Users can log in with email and password successfully
- Users can log in with Google OAuth successfully
- JWT token issued on successful authentication
- Token required for all protected endpoints
- Token expiration handled gracefully

Multi-Drive Support:
- Authenticated users can add multiple Google Drive accounts
- Each drive account correctly associated with owning user
- Files from all user's drive accounts displayed in unified view
- Search operates across all user's connected drives
- Users can remove connected drive accounts
- Drive account operations scoped to authenticated user only

### Security Requirements

Authentication Security:
- No userId accepted from URL parameters on protected routes
- User context derived exclusively from verified JWT token
- Password stored hashed, never plain text
- Token signature verified on every protected request
- Token expiration enforced consistently

Authorization Security:
- Users cannot access other users' drive accounts
- Users cannot view other users' files
- Users cannot perform operations on resources they don't own
- Database queries scoped to authenticated userId
- OAuth state protected against tampering

### Performance Requirements

Response Times:
- Authentication endpoints respond within 500ms (p95)
- Protected endpoints respond within 1000ms (p95)
- File aggregation across multiple drives completes within 3000ms (p95)

Scalability:
- System supports 10,000 concurrent authenticated users
- Token verification overhead less than 50ms per request
- Database queries optimized with appropriate indexes

### User Experience Requirements

Seamless Flow:
- Login redirects to dashboard immediately
- Dashboard displays files from all connected drives
- Adding drive account requires minimal clicks
- Token expiration handled with re-authentication prompt
- Error messages clear and actionable

Data Consistency:
- Files from newly added drive account appear after sync
- Removing drive account removes associated files
- Search results reflect current connected accounts
- Profile information matches authenticated user

## Risk Assessment

### High-Risk Areas

**Authentication System Changes**
- Risk: Breaking existing login flows for users
- Mitigation: Phased rollout with backward compatibility
- Mitigation: Comprehensive testing before production deployment
- Mitigation: Rollback plan ready for immediate reversion

**Data Access Control Refactoring**
- Risk: Introducing cross-user data leakage during transition
- Mitigation: Audit all queries before deployment
- Mitigation: Automated tests for data isolation
- Mitigation: Monitoring and alerting on authorization failures

**OAuth Flow Modifications**
- Risk: Breaking drive account linking functionality
- Mitigation: Test OAuth flow thoroughly in staging environment
- Mitigation: Maintain backward compatibility during migration
- Mitigation: Clear error messages for OAuth failures

### Medium-Risk Areas

**Frontend State Management Refactoring**
- Risk: Authentication state inconsistencies after changes
- Mitigation: Comprehensive frontend testing
- Mitigation: Gradual rollout page by page
- Mitigation: Feature flags for toggling new behavior

**Token Expiration Handling**
- Risk: Users unexpectedly logged out mid-operation
- Mitigation: Implement token refresh mechanism
- Mitigation: Clear messaging on token expiration
- Mitigation: Automatic re-authentication flow

### Low-Risk Areas

**API Response Format Standardization**
- Risk: Frontend parsing errors with new format
- Mitigation: Update frontend and backend simultaneously
- Mitigation: TypeScript interfaces catch format mismatches at compile time

**Documentation Updates**
- Risk: Outdated documentation causes confusion
- Mitigation: Update documentation as part of implementation
- Mitigation: Include examples for new API patterns

## Monitoring and Observability

### Authentication Metrics

Key metrics to track:
- Authentication success rate (target: >95%)
- Authentication failure rate by reason (invalid credentials, expired token, etc.)
- Token verification latency (target: <50ms p95)
- User registration rate
- Active user sessions

### Authorization Metrics

Key metrics to track:
- Authorization failure rate (403 responses)
- Cross-user access attempts (should be 0)
- Resource ownership validation failures
- OAuth state validation failures

### Logging Strategy

Authentication events to log:
- Successful login (userId, timestamp, IP)
- Failed login attempts (email, reason, timestamp, IP)
- Token verification failures (reason, timestamp)
- User registration (userId, timestamp, IP)

Authorization events to log:
- Authorization failures (userId, resource, timestamp)
- Ownership validation failures (userId, resourceId, timestamp)
- OAuth state validation failures (reason, timestamp)

Security events to log:
- Unusual access patterns (rapid requests, unusual endpoints)
- Rate limit violations
- Token manipulation attempts
- Cross-user access attempts

### Alerting

Critical alerts:
- Authentication failure rate exceeds 10% over 5-minute window
- Cross-user access attempt detected
- OAuth state validation failure rate exceeds 5%
- Database query errors in authentication or authorization

Warning alerts:
- Authentication latency exceeds 500ms p95
- Token verification latency exceeds 100ms p95
- Rate limit triggering frequently

## Confidence Assessment

**Confidence Level: High**

**Confidence Basis:**

Strengths:
- Clear understanding of current architecture through code analysis
- Well-defined security vulnerabilities identified
- Proven patterns for token-based authentication
- Phased implementation approach reduces risk
- Backward compatibility strategy enables safe migration

Supporting Factors:
- JWT infrastructure already in place (jwt.ts utilities)
- Authentication middleware foundation exists (auth.middleware.ts)
- DriveAccount model properly structured for multi-account support
- Database schema supports secure architecture
- TypeScript provides compile-time safety for refactoring

Known Challenges:
- OAuth flow modifications require careful state management
- Frontend localStorage dependency needs systematic removal
- Testing cross-user access prevention requires comprehensive scenarios
- Google token refresh not currently implemented (optional enhancement)
- User B connects Google Drive account Z
- Each drive contains identifiable test files

Expected behavior:
- User A calls GET /api/drive/files with their JWT
- Response includes files from drives X and Y only
- Files tagged with driveAccountName or driveAccountEmail
- User A cannot see files from drive Z

- User B calls GET /api/drive/files with their JWT
- Response includes files from drive Z only
- User B cannot see files from drives X or Y

**Search Across Accounts**

Validate search operates correctly across user's connected drives only.

Test scenarios:
- User A searches for term that matches files in drives X and Y
- Results include matches from both X and Y
- Results do not include matches from User B's drive Z
- Search results properly attributed to source drive account

- User B searches for same term
- Results include matches from drive Z only
- Results do not include User A's files

**Profile Data Display**

Validate profile information correctly scoped to authenticated user.

Test scenarios:
- User A calls GET /api/drive/profile with their JWT
- Response includes profile from first connected drive account (X or Y)
- Profile information updates on drive account re-authentication

- User B calls GET /api/drive/profile with their JWT
- Response includes profile from drive Z
- User B does not receive User A's profile data

#### Race Condition and Edge Case Testing

**Concurrent Drive Account Operations**

Test system behavior under concurrent operations.

Test scenarios:
- User adds two drive accounts simultaneously
- Both accounts successfully created without collision
- Each account has unique DriveAccount record
- No token overwrites or data corruption

- User syncs files while adding new drive account
- Sync completes for existing accounts
- New account available after OAuth completes
- No sync errors or missing files

**Token Expiration During Operation**

Test graceful handling of token expiration mid-operation.

Test scenarios:
- User initiates file sync
- Token expires during sync operation
- Request fails with 401 Unauthorized
- Frontend detects expiration and redirects to login
- User re-authenticates and can retry sync

**Drive Account Token Refresh**

Google OAuth tokens expire and need refresh. Validate refresh handling.

Test scenarios:
- DriveAccount has expired access token
- Backend attempts to fetch files from Google API
- Google API returns 401 Unauthorized
- Backend uses refresh token to obtain new access token
- Backend updates DriveAccount with new access token
- File fetch retries with new token and succeeds
- User sees files without manual re-authentication

Missing implementation:
- Current system does not implement Google token refresh
- Required: detect Google API 401 responses
- Required: call Google token refresh endpoint with stored refresh token
- Required: update DriveAccount with new tokens
- Required: retry original API call with refreshed token

#### Security Audit Checklist

**Authentication Security**

- [ ] All protected routes require valid JWT token
- [ ] Token signature verified using secure secret
- [ ] Token expiration checked and enforced
- [ ] User existence validated during token verification
- [ ] No userId accepted from URL parameters on protected routes
- [ ] All user context derived from authenticated token
- [ ] Password hashing uses bcrypt with appropriate cost factor
- [ ] Login attempts rate-limited to prevent brute force
- [ ] Sensitive routes use HTTPS in production

**Authorization Security**

- [ ] Database queries filter by authenticated userId
- [ ] Resource ownership validated before modification
- [ ] Cross-user data access prevented through query scoping
- [ ] Drive account operations check userId ownership
- [ ] File operations scoped to authenticated user's drives
- [ ] OAuth state parameter cryptographically signed
- [ ] OAuth state includes CSRF protection
- [ ] State parameter validated before drive account linking

**Data Protection**

- [ ] Passwords never stored in plain text
- [ ] JWT secret stored securely (environment variable)
- [ ] Google OAuth tokens encrypted at rest (optional enhancement)
- [ ] Sensitive data excluded from error messages
- [ ] User enumeration prevented through error message consistency
- [ ] API responses exclude sensitive token data
- [ ] Logging does not expose passwords or tokens

**Input Validation**

- [ ] Email format validated on registration and login
- [ ] Password complexity requirements enforced
- [ ] SQL injection prevented through ORM usage
- [ ] NoSQL injection prevented through input sanitization
- [ ] XSS prevented through output encoding
- [ ] CSRF protection on state-changing operations

## Implementation Phases

### Phase 1: Core Authentication Remediation

**Week 1-2: Backend Token Infrastructure**

Activities:
- Enhance authenticateToken middleware to be mandatory standard
- Refactor auth.controller to eliminate userId parameter dependencies
- Update auth.routes to remove userId from route paths
- Implement AuthenticatedRequest interface consistently
- Add input validation to registration and login endpoints
- Implement rate limiting on authentication endpoints
- Add comprehensive error handling and logging

Deliverables:
- Updated middleware with consistent token validation
- Refactored authentication controllers using token-derived userId
- Updated route definitions removing userId parameters
- Enhanced security controls on auth endpoints

**Week 3-4: Frontend Authentication State**

Activities:
- Remove localStorage userId dependency from frontend
- Update auth utility functions to use JWT-only
- Create AuthContext for centralized authentication state
- Implement useAuth, useUser hooks
- Enhance axios interceptor for automatic token handling
- Update Login and Register components to work with new flow
- Handle token expiration and redirect to login

Deliverables:
- JWT-centric authentication state management
- React context and hooks for auth state
- Updated authentication components
- Improved error handling for auth failures

### Phase 2: Token-Driven Identity Management

**Week 5-6: Protected Route Refactoring**

Activities:
- Apply authenticateToken middleware to all protected routes
- Refactor drive.controller to use request.userId
- Update getDriveFiles, getAllDriveAccounts, syncDriveFiles
- Refactor profile.controller to use request.userId
- Update route definitions to remove userId parameters
- Implement ownership validation middleware
- Apply ownership checks to resource deletion routes

Deliverables:
- All protected routes require authentication
- All controllers use token-derived userId
- Ownership validation on resource-specific operations
- Updated route definitions

**Week 7: API Contract Standardization**

Activities:
- Standardize response structures across all endpoints
- Implement consistent error response format
- Update HTTP status code usage
- Update frontend API clients to match new contracts
- Update TypeScript interfaces for request/response
- Create API documentation reflecting new contracts

Deliverables:
- Consistent API response structure
- Standardized error handling
- Updated frontend API layer
- API documentation

### Phase 3: Multi-Drive Account Architecture Validation

**Week 8-9: OAuth Flow Hardening**

Activities:
- Implement secure OAuth state generation with signing
- Refactor add-drive-account initiation to use token userId
- Update OAuth callback to validate state signature
- Implement CSRF protection in OAuth state
- Add state expiration checking
- Update frontend drive account addition flow
- Test drive account linking with multiple accounts

Deliverables:
- Cryptographically secure OAuth state management
- Token-based drive account linking
- CSRF-protected OAuth flow
- Multiple account support validated

**Week 10: Data Isolation Validation**

Activities:
- Audit all database queries for userId filtering
- Implement defense-in-depth query scoping
- Add logging for authorization failures
- Create automated tests for data isolation
- Test cross-user access prevention
- Validate file aggregation scoping
- Validate search result scoping

Deliverables:
- All queries properly scoped to authenticated user
- Automated tests for data isolation
- Authorization logging
- Validated data boundaries

### Phase 4: End-to-End Verification

**Week 11: Flow Testing**

Activities:
- Execute complete email registration and login flows
- Execute Google OAuth flow end-to-end
- Test multi-drive account addition
- Test drive account removal
- Test file sync across multiple accounts
- Test search across multiple accounts
- Validate profile retrieval

Deliverables:
- Comprehensive flow test results
- Identified and resolved edge cases
- Documented test scenarios

**Week 12: Security Audit and Hardening**

Activities:
- Execute security audit checklist
- Penetration testing for authentication bypass
- Test token manipulation attacks
- Validate OAuth state tampering prevention
- Test concurrent operations and race conditions
- Implement Google token refresh for expired DriveAccount tokens
- Address identified vulnerabilities

Deliverables:
- Completed security audit checklist
- Resolved security findings
- Token refresh implementation
- Production-ready authentication system

## Technical Specifications

### Authentication Middleware

**Interface Contract**

Middleware function signature:
- Accepts Request, Response, NextFunction from Express
- Reads Authorization header from request
- Extracts Bearer token from header
- Verifies JWT signature and expiration
- Queries User model to validate user existence
- Augments request object with userId and userEmail
- Calls next() on success
- Returns 401 or 403 error on failure

Request augmentation:
- request.userId: string (user's database _id)
- request.userEmail: string (user's email address)
- Optional: request.user (full user object)

Error responses:
- 401 Unauthorized: Token missing or expired
- 403 Forbidden: Token invalid or user not found
- 500 Internal Server Error: Unexpected error during validation

### JWT Token Structure

**Token Claims**

Standard claims:
- iat (issued at): Timestamp of token generation
- exp (expires at): Timestamp when token becomes invalid
- iss (issuer): Application identifier

Custom claims:
- userId: User's database _id (string)
- email: User's email address (string)

Token configuration:
- Algorithm: HS256 (HMAC SHA-256)
- Secret: Environment variable JWT_SECRET
- Expiration: 7 days (configurable)
- Issuer: "drivesync-api" (configurable)

### OAuth State Structure

**State Payload**

State components:
- userId: Authenticated user's database _id
- csrfToken: Randomly generated CSRF protection token
- timestamp: State generation timestamp for expiration checking
- nonce: One-time-use identifier to prevent replay

State format:
- JSON payload containing above components
- Base64-encoded for URL safety
- HMAC signature appended
- Final format: {base64Payload}.{signature}

State validation:
- Verify signature matches payload using server secret
- Check timestamp is within valid window (15 minutes)
- Verify nonce has not been used (requires nonce tracking)
- Extract userId only after validation passes

### Database Query Patterns

**User-Scoped Queries**

DriveAccount queries:
- Always include { userId: request.userId } in filter
- Never accept userId from client request
- Use MongoDB ObjectId for userId comparison

File queries:
- Always include { userId: request.userId } in filter
- Join with DriveAccount to ensure proper scoping
- Support cross-account aggregation within same user

**Ownership Validation Queries**

Resource retrieval pattern:
- Query by resource _id to retrieve full document
- Check document.userId === request.userId
- Return 403 if ownership fails
- Proceed with operation if ownership confirmed

Example for DriveAccount deletion:
- Find DriveAccount by accountId
- Verify driveAccount.userId equals request.userId
- Delete account and associated files if owned
- Return 403 Forbidden if not owned

### Error Response Format

**Standard Error Structure**

Error response body:
- error: Human-readable error message (string)
- code: Application-specific error code (string, optional)
- details: Additional context or validation errors (object, optional)

Example validation error:
```
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

Example authentication error:
```
{
  "error": "Invalid or expired token",
  "code": "AUTH_TOKEN_INVALID"
}
```

Example authorization error:
```
{
  "error": "You do not have permission to access this resource",
  "code": "FORBIDDEN"
}
```

## Migration Strategy

### Backward Compatibility

**Phased Route Transition**

To avoid breaking existing clients during migration, support both old and new routes temporarily.

Strategy:
- Deploy new token-based routes alongside existing parameterized routes
- Existing routes marked as deprecated in documentation
- Both routes share underlying service logic
- Gradually migrate frontend to new routes
- Monitor usage of deprecated routes
- Remove deprecated routes after migration window

Deprecation timeline:
- Week 1-2: Deploy new routes alongside existing
- Week 3-8: Migrate frontend components to new routes
- Week 9-10: Monitor for any remaining usage of old routes
- Week 11-12: Remove deprecated routes from backend

**Frontend Migration**

Incremental frontend updates minimize risk and enable rollback.

Migration approach:
- Update authentication state management first
- Migrate page by page to new API endpoints
- Use feature flags to toggle between old and new behavior
- Test each page thoroughly before proceeding
- Keep rollback plan ready in case of issues

### Data Migration

**Existing User Records**

Current users may have incomplete or inconsistent authType fields.

Data cleanup required:
- Audit existing User records for authType
- Set authType='google' for users with googleId
- Set authType='email' for users with password but no googleId
- Identify and handle edge cases (users with both)

**Existing Sessions**

Users with active sessions need to re-authenticate under new system.

Session invalidation strategy:
- Clear all existing session cookies
- Force token refresh for all active users
- Show informational message about re-authentication
- Preserve user data, only clear authentication state

### Rollback Planning

**Version Control Strategy**

Maintain ability to rollback authentication changes.

Git strategy:
- Each phase merged as separate feature branch
- Tag releases at phase boundaries
- Maintain backward-compatible API during migration
- Document rollback procedure for each phase

**Rollback Triggers**

Conditions that would require rollback:
- Authentication failure rate exceeds threshold (>5%)
- Unable to log in via email or Google OAuth
- Cross-user data access detected in logs
- Drive account linking failing consistently
- Performance degradation beyond acceptable limits

Rollback procedure:
- Revert to previous stable release tag
- Restore database from backup if schema changes made
- Clear authentication state for all users
- Communicate issue and resolution timeline to users

## Success Criteria

### Functional Requirements

Authentication:
- Users can register with email and password successfully
- Users can log in with email and password successfully
- Users can log in with Google OAuth successfully
- JWT token issued on successful authentication
- Token required for all protected endpoints
- Token expiration handled gracefully

Multi-Drive Support:
- Authenticated users can add multiple Google Drive accounts
- Each drive account correctly associated with owning user
- Files from all user's drive accounts displayed in unified view
- Search operates across all user's connected drives
- Users can remove connected drive accounts
- Drive account operations scoped to authenticated user only

### Security Requirements

Authentication Security:
- No userId accepted from URL parameters on protected routes
- User context derived exclusively from verified JWT token
- Password stored hashed, never plain text
- Token signature verified on every protected request
- Token expiration enforced consistently

Authorization Security:
- Users cannot access other users' drive accounts
- Users cannot view other users' files
- Users cannot perform operations on resources they don't own
- Database queries scoped to authenticated userId
- OAuth state protected against tampering

### Performance Requirements

Response Times:
- Authentication endpoints respond within 500ms (p95)
- Protected endpoints respond within 1000ms (p95)
- File aggregation across multiple drives completes within 3000ms (p95)

Scalability:
- System supports 10,000 concurrent authenticated users
- Token verification overhead less than 50ms per request
- Database queries optimized with appropriate indexes

### User Experience Requirements

Seamless Flow:
- Login redirects to dashboard immediately
- Dashboard displays files from all connected drives
- Adding drive account requires minimal clicks
- Token expiration handled with re-authentication prompt
- Error messages clear and actionable

Data Consistency:
- Files from newly added drive account appear after sync
- Removing drive account removes associated files
- Search results reflect current connected accounts
- Profile information matches authenticated user

## Risk Assessment

### High-Risk Areas

**Authentication System Changes**
- Risk: Breaking existing login flows for users
- Mitigation: Phased rollout with backward compatibility
- Mitigation: Comprehensive testing before production deployment
- Mitigation: Rollback plan ready for immediate reversion

**Data Access Control Refactoring**
- Risk: Introducing cross-user data leakage during transition
- Mitigation: Audit all queries before deployment
- Mitigation: Automated tests for data isolation
- Mitigation: Monitoring and alerting on authorization failures

**OAuth Flow Modifications**
- Risk: Breaking drive account linking functionality
- Mitigation: Test OAuth flow thoroughly in staging environment
- Mitigation: Maintain backward compatibility during migration
- Mitigation: Clear error messages for OAuth failures

### Medium-Risk Areas

**Frontend State Management Refactoring**
- Risk: Authentication state inconsistencies after changes
- Mitigation: Comprehensive frontend testing
- Mitigation: Gradual rollout page by page
- Mitigation: Feature flags for toggling new behavior

**Token Expiration Handling**
- Risk: Users unexpectedly logged out mid-operation
- Mitigation: Implement token refresh mechanism
- Mitigation: Clear messaging on token expiration
- Mitigation: Automatic re-authentication flow

### Low-Risk Areas

**API Response Format Standardization**
- Risk: Frontend parsing errors with new format
- Mitigation: Update frontend and backend simultaneously
- Mitigation: TypeScript interfaces catch format mismatches at compile time

**Documentation Updates**
- Risk: Outdated documentation causes confusion
- Mitigation: Update documentation as part of implementation
- Mitigation: Include examples for new API patterns

## Monitoring and Observability

### Authentication Metrics

Key metrics to track:
- Authentication success rate (target: >95%)
- Authentication failure rate by reason (invalid credentials, expired token, etc.)
- Token verification latency (target: <50ms p95)
- User registration rate
- Active user sessions

### Authorization Metrics

Key metrics to track:
- Authorization failure rate (403 responses)
- Cross-user access attempts (should be 0)
- Resource ownership validation failures
- OAuth state validation failures

### Logging Strategy

Authentication events to log:
- Successful login (userId, timestamp, IP)
- Failed login attempts (email, reason, timestamp, IP)
- Token verification failures (reason, timestamp)
- User registration (userId, timestamp, IP)

Authorization events to log:
- Authorization failures (userId, resource, timestamp)
- Ownership validation failures (userId, resourceId, timestamp)
- OAuth state validation failures (reason, timestamp)

Security events to log:
- Unusual access patterns (rapid requests, unusual endpoints)
- Rate limit violations
- Token manipulation attempts
- Cross-user access attempts

### Alerting

Critical alerts:
- Authentication failure rate exceeds 10% over 5-minute window
- Cross-user access attempt detected
- OAuth state validation failure rate exceeds 5%
- Database query errors in authentication or authorization

Warning alerts:
- Authentication latency exceeds 500ms p95
- Token verification latency exceeds 100ms p95
- Rate limit triggering frequently

## Confidence Assessment

**Confidence Level: High**

**Confidence Basis:**

Strengths:
- Clear understanding of current architecture through code analysis
- Well-defined security vulnerabilities identified
- Proven patterns for token-based authentication
- Phased implementation approach reduces risk
- Backward compatibility strategy enables safe migration

Supporting Factors:
- JWT infrastructure already in place (jwt.ts utilities)
- Authentication middleware foundation exists (auth.middleware.ts)
- DriveAccount model properly structured for multi-account support
- Database schema supports secure architecture
- TypeScript provides compile-time safety for refactoring

Known Challenges:
- OAuth flow modifications require careful state management
- Frontend localStorage dependency needs systematic removal
- Testing cross-user access prevention requires comprehensive scenarios
- Google token refresh not currently implemented (optional enhancement)
- User B connects Google Drive account Z
- Each drive contains identifiable test files

Expected behavior:
- User A calls GET /api/drive/files with their JWT
- Response includes files from drives X and Y only
- Files tagged with driveAccountName or driveAccountEmail
- User A cannot see files from drive Z

- User B calls GET /api/drive/files with their JWT
- Response includes files from drive Z only
- User B cannot see files from drives X or Y

**Search Across Accounts**

Validate search operates correctly across user's connected drives only.

Test scenarios:
- User A searches for term that matches files in drives X and Y
- Results include matches from both X and Y
- Results do not include matches from User B's drive Z
- Search results properly attributed to source drive account

- User B searches for same term
- Results include matches from drive Z only
- Results do not include User A's files

**Profile Data Display**

Validate profile information correctly scoped to authenticated user.

Test scenarios:
- User A calls GET /api/drive/profile with their JWT
- Response includes profile from first connected drive account (X or Y)
- Profile information updates on drive account re-authentication

- User B calls GET /api/drive/profile with their JWT
- Response includes profile from drive Z
- User B does not receive User A's profile data

#### Race Condition and Edge Case Testing

**Concurrent Drive Account Operations**

Test system behavior under concurrent operations.

Test scenarios:
- User adds two drive accounts simultaneously
- Both accounts successfully created without collision
- Each account has unique DriveAccount record
- No token overwrites or data corruption

- User syncs files while adding new drive account
- Sync completes for existing accounts
- New account available after OAuth completes
- No sync errors or missing files

**Token Expiration During Operation**

Test graceful handling of token expiration mid-operation.

Test scenarios:
- User initiates file sync
- Token expires during sync operation
- Request fails with 401 Unauthorized
- Frontend detects expiration and redirects to login
- User re-authenticates and can retry sync

**Drive Account Token Refresh**

Google OAuth tokens expire and need refresh. Validate refresh handling.

Test scenarios:
- DriveAccount has expired access token
- Backend attempts to fetch files from Google API
- Google API returns 401 Unauthorized
- Backend uses refresh token to obtain new access token
- Backend updates DriveAccount with new access token
- File fetch retries with new token and succeeds
- User sees files without manual re-authentication

Missing implementation:
- Current system does not implement Google token refresh
- Required: detect Google API 401 responses
- Required: call Google token refresh endpoint with stored refresh token
- Required: update DriveAccount with new tokens
- Required: retry original API call with refreshed token

#### Security Audit Checklist

**Authentication Security**

- [ ] All protected routes require valid JWT token
- [ ] Token signature verified using secure secret
- [ ] Token expiration checked and enforced
- [ ] User existence validated during token verification
- [ ] No userId accepted from URL parameters on protected routes
- [ ] All user context derived from authenticated token
- [ ] Password hashing uses bcrypt with appropriate cost factor
- [ ] Login attempts rate-limited to prevent brute force
- [ ] Sensitive routes use HTTPS in production

**Authorization Security**

- [ ] Database queries filter by authenticated userId
- [ ] Resource ownership validated before modification
- [ ] Cross-user data access prevented through query scoping
- [ ] Drive account operations check userId ownership
- [ ] File operations scoped to authenticated user's drives
- [ ] OAuth state parameter cryptographically signed
- [ ] OAuth state includes CSRF protection
- [ ] State parameter validated before drive account linking

**Data Protection**

- [ ] Passwords never stored in plain text
- [ ] JWT secret stored securely (environment variable)
- [ ] Google OAuth tokens encrypted at rest (optional enhancement)
- [ ] Sensitive data excluded from error messages
- [ ] User enumeration prevented through error message consistency
- [ ] API responses exclude sensitive token data
- [ ] Logging does not expose passwords or tokens

**Input Validation**

- [ ] Email format validated on registration and login
- [ ] Password complexity requirements enforced
- [ ] SQL injection prevented through ORM usage
- [ ] NoSQL injection prevented through input sanitization
- [ ] XSS prevented through output encoding
- [ ] CSRF protection on state-changing operations

## Implementation Phases

### Phase 1: Core Authentication Remediation

**Week 1-2: Backend Token Infrastructure**

Activities:
- Enhance authenticateToken middleware to be mandatory standard
- Refactor auth.controller to eliminate userId parameter dependencies
- Update auth.routes to remove userId from route paths
- Implement AuthenticatedRequest interface consistently
- Add input validation to registration and login endpoints
- Implement rate limiting on authentication endpoints
- Add comprehensive error handling and logging

Deliverables:
- Updated middleware with consistent token validation
- Refactored authentication controllers using token-derived userId
- Updated route definitions removing userId parameters
- Enhanced security controls on auth endpoints

**Week 3-4: Frontend Authentication State**

Activities:
- Remove localStorage userId dependency from frontend
- Update auth utility functions to use JWT-only
- Create AuthContext for centralized authentication state
- Implement useAuth, useUser hooks
- Enhance axios interceptor for automatic token handling
- Update Login and Register components to work with new flow
- Handle token expiration and redirect to login

Deliverables:
- JWT-centric authentication state management
- React context and hooks for auth state
- Updated authentication components
- Improved error handling for auth failures

### Phase 2: Token-Driven Identity Management

**Week 5-6: Protected Route Refactoring**

Activities:
- Apply authenticateToken middleware to all protected routes
- Refactor drive.controller to use request.userId
- Update getDriveFiles, getAllDriveAccounts, syncDriveFiles
- Refactor profile.controller to use request.userId
- Update route definitions to remove userId parameters
- Implement ownership validation middleware
- Apply ownership checks to resource deletion routes

Deliverables:
- All protected routes require authentication
- All controllers use token-derived userId
- Ownership validation on resource-specific operations
- Updated route definitions

**Week 7: API Contract Standardization**

Activities:
- Standardize response structures across all endpoints
- Implement consistent error response format
- Update HTTP status code usage
- Update frontend API clients to match new contracts
- Update TypeScript interfaces for request/response
- Create API documentation reflecting new contracts

Deliverables:
- Consistent API response structure
- Standardized error handling
- Updated frontend API layer
- API documentation

### Phase 3: Multi-Drive Account Architecture Validation

**Week 8-9: OAuth Flow Hardening**

Activities:
- Implement secure OAuth state generation with signing
- Refactor add-drive-account initiation to use token userId
- Update OAuth callback to validate state signature
- Implement CSRF protection in OAuth state
- Add state expiration checking
- Update frontend drive account addition flow
- Test drive account linking with multiple accounts

Deliverables:
- Cryptographically secure OAuth state management
- Token-based drive account linking
- CSRF-protected OAuth flow
- Multiple account support validated

**Week 10: Data Isolation Validation**

Activities:
- Audit all database queries for userId filtering
- Implement defense-in-depth query scoping
- Add logging for authorization failures
- Create automated tests for data isolation
- Test cross-user access prevention
- Validate file aggregation scoping
- Validate search result scoping

Deliverables:
- All queries properly scoped to authenticated user
- Automated tests for data isolation
- Authorization logging
- Validated data boundaries

### Phase 4: End-to-End Verification

**Week 11: Flow Testing**

Activities:
- Execute complete email registration and login flows
- Execute Google OAuth flow end-to-end
- Test multi-drive account addition
- Test drive account removal
- Test file sync across multiple accounts
- Test search across multiple accounts
- Validate profile retrieval

Deliverables:
- Comprehensive flow test results
- Identified and resolved edge cases
- Documented test scenarios

**Week 12: Security Audit and Hardening**

Activities:
- Execute security audit checklist
- Penetration testing for authentication bypass
- Test token manipulation attacks
- Validate OAuth state tampering prevention
- Test concurrent operations and race conditions
- Implement Google token refresh for expired DriveAccount tokens
- Address identified vulnerabilities

Deliverables:
- Completed security audit checklist
- Resolved security findings
- Token refresh implementation
- Production-ready authentication system

## Technical Specifications

### Authentication Middleware

**Interface Contract**

Middleware function signature:
- Accepts Request, Response, NextFunction from Express
- Reads Authorization header from request
- Extracts Bearer token from header
- Verifies JWT signature and expiration
- Queries User model to validate user existence
- Augments request object with userId and userEmail
- Calls next() on success
- Returns 401 or 403 error on failure

Request augmentation:
- request.userId: string (user's database _id)
- request.userEmail: string (user's email address)
- Optional: request.user (full user object)

Error responses:
- 401 Unauthorized: Token missing or expired
- 403 Forbidden: Token invalid or user not found
- 500 Internal Server Error: Unexpected error during validation

### JWT Token Structure

**Token Claims**

Standard claims:
- iat (issued at): Timestamp of token generation
- exp (expires at): Timestamp when token becomes invalid
- iss (issuer): Application identifier

Custom claims:
- userId: User's database _id (string)
- email: User's email address (string)

Token configuration:
- Algorithm: HS256 (HMAC SHA-256)
- Secret: Environment variable JWT_SECRET
- Expiration: 7 days (configurable)
- Issuer: "drivesync-api" (configurable)

### OAuth State Structure

**State Payload**

State components:
- userId: Authenticated user's database _id
- csrfToken: Randomly generated CSRF protection token
- timestamp: State generation timestamp for expiration checking
- nonce: One-time-use identifier to prevent replay

State format:
- JSON payload containing above components
- Base64-encoded for URL safety
- HMAC signature appended
- Final format: {base64Payload}.{signature}

State validation:
- Verify signature matches payload using server secret
- Check timestamp is within valid window (15 minutes)
- Verify nonce has not been used (requires nonce tracking)
- Extract userId only after validation passes

### Database Query Patterns

**User-Scoped Queries**

DriveAccount queries:
- Always include { userId: request.userId } in filter
- Never accept userId from client request
- Use MongoDB ObjectId for userId comparison

File queries:
- Always include { userId: request.userId } in filter
- Join with DriveAccount to ensure proper scoping
- Support cross-account aggregation within same user

**Ownership Validation Queries**

Resource retrieval pattern:
- Query by resource _id to retrieve full document
- Check document.userId === request.userId
- Return 403 if ownership fails
- Proceed with operation if ownership confirmed

Example for DriveAccount deletion:
- Find DriveAccount by accountId
- Verify driveAccount.userId equals request.userId
- Delete account and associated files if owned
- Return 403 Forbidden if not owned

### Error Response Format

**Standard Error Structure**

Error response body:
- error: Human-readable error message (string)
- code: Application-specific error code (string, optional)
- details: Additional context or validation errors (object, optional)

Example validation error:
```
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

Example authentication error:
```
{
  "error": "Invalid or expired token",
  "code": "AUTH_TOKEN_INVALID"
}
```

Example authorization error:
```
{
  "error": "You do not have permission to access this resource",
  "code": "FORBIDDEN"
}
```

## Migration Strategy

### Backward Compatibility

**Phased Route Transition**

To avoid breaking existing clients during migration, support both old and new routes temporarily.

Strategy:
- Deploy new token-based routes alongside existing parameterized routes
- Existing routes marked as deprecated in documentation
- Both routes share underlying service logic
- Gradually migrate frontend to new routes
- Monitor usage of deprecated routes
- Remove deprecated routes after migration window

Deprecation timeline:
- Week 1-2: Deploy new routes alongside existing
- Week 3-8: Migrate frontend components to new routes
- Week 9-10: Monitor for any remaining usage of old routes
- Week 11-12: Remove deprecated routes from backend

**Frontend Migration**

Incremental frontend updates minimize risk and enable rollback.

Migration approach:
- Update authentication state management first
- Migrate page by page to new API endpoints
- Use feature flags to toggle between old and new behavior
- Test each page thoroughly before proceeding
- Keep rollback plan ready in case of issues

### Data Migration

**Existing User Records**

Current users may have incomplete or inconsistent authType fields.

Data cleanup required:
- Audit existing User records for authType
- Set authType='google' for users with googleId
- Set authType='email' for users with password but no googleId
- Identify and handle edge cases (users with both)

**Existing Sessions**

Users with active sessions need to re-authenticate under new system.

Session invalidation strategy:
- Clear all existing session cookies
- Force token refresh for all active users
- Show informational message about re-authentication
- Preserve user data, only clear authentication state

### Rollback Planning

**Version Control Strategy**

Maintain ability to rollback authentication changes.

Git strategy:
- Each phase merged as separate feature branch
- Tag releases at phase boundaries
- Maintain backward-compatible API during migration
- Document rollback procedure for each phase

**Rollback Triggers**

Conditions that would require rollback:
- Authentication failure rate exceeds threshold (>5%)
- Unable to log in via email or Google OAuth
- Cross-user data access detected in logs
- Drive account linking failing consistently
- Performance degradation beyond acceptable limits

Rollback procedure:
- Revert to previous stable release tag
- Restore database from backup if schema changes made
- Clear authentication state for all users
- Communicate issue and resolution timeline to users

## Success Criteria

### Functional Requirements

Authentication:
- Users can register with email and password successfully
- Users can log in with email and password successfully
- Users can log in with Google OAuth successfully
- JWT token issued on successful authentication
- Token required for all protected endpoints
- Token expiration handled gracefully

Multi-Drive Support:
- Authenticated users can add multiple Google Drive accounts
- Each drive account correctly associated with owning user
- Files from all user's drive accounts displayed in unified view
- Search operates across all user's connected drives
- Users can remove connected drive accounts
- Drive account operations scoped to authenticated user only

### Security Requirements

Authentication Security:
- No userId accepted from URL parameters on protected routes
- User context derived exclusively from verified JWT token
- Password stored hashed, never plain text
- Token signature verified on every protected request
- Token expiration enforced consistently

Authorization Security:
- Users cannot access other users' drive accounts
- Users cannot view other users' files
- Users cannot perform operations on resources they don't own
- Database queries scoped to authenticated userId
- OAuth state protected against tampering

### Performance Requirements

Response Times:
- Authentication endpoints respond within 500ms (p95)
- Protected endpoints respond within 1000ms (p95)
- File aggregation across multiple drives completes within 3000ms (p95)

Scalability:
- System supports 10,000 concurrent authenticated users
- Token verification overhead less than 50ms per request
- Database queries optimized with appropriate indexes

### User Experience Requirements

Seamless Flow:
- Login redirects to dashboard immediately
- Dashboard displays files from all connected drives
- Adding drive account requires minimal clicks
- Token expiration handled with re-authentication prompt
- Error messages clear and actionable

Data Consistency:
- Files from newly added drive account appear after sync
- Removing drive account removes associated files
- Search results reflect current connected accounts
- Profile information matches authenticated user

## Risk Assessment

### High-Risk Areas

**Authentication System Changes**
- Risk: Breaking existing login flows for users
- Mitigation: Phased rollout with backward compatibility
- Mitigation: Comprehensive testing before production deployment
- Mitigation: Rollback plan ready for immediate reversion

**Data Access Control Refactoring**
- Risk: Introducing cross-user data leakage during transition
- Mitigation: Audit all queries before deployment
- Mitigation: Automated tests for data isolation
- Mitigation: Monitoring and alerting on authorization failures

**OAuth Flow Modifications**
- Risk: Breaking drive account linking functionality
- Mitigation: Test OAuth flow thoroughly in staging environment
- Mitigation: Maintain backward compatibility during migration
- Mitigation: Clear error messages for OAuth failures

### Medium-Risk Areas

**Frontend State Management Refactoring**
- Risk: Authentication state inconsistencies after changes
- Mitigation: Comprehensive frontend testing
- Mitigation: Gradual rollout page by page
- Mitigation: Feature flags for toggling new behavior

**Token Expiration Handling**
- Risk: Users unexpectedly logged out mid-operation
- Mitigation: Implement token refresh mechanism
- Mitigation: Clear messaging on token expiration
- Mitigation: Automatic re-authentication flow

### Low-Risk Areas

**API Response Format Standardization**
- Risk: Frontend parsing errors with new format
- Mitigation: Update frontend and backend simultaneously
- Mitigation: TypeScript interfaces catch format mismatches at compile time

**Documentation Updates**
- Risk: Outdated documentation causes confusion
- Mitigation: Update documentation as part of implementation
- Mitigation: Include examples for new API patterns

## Monitoring and Observability

### Authentication Metrics

Key metrics to track:
- Authentication success rate (target: >95%)
- Authentication failure rate by reason (invalid credentials, expired token, etc.)
- Token verification latency (target: <50ms p95)
- User registration rate
- Active user sessions

### Authorization Metrics

Key metrics to track:
- Authorization failure rate (403 responses)
- Cross-user access attempts (should be 0)
- Resource ownership validation failures
- OAuth state validation failures

### Logging Strategy

Authentication events to log:
- Successful login (userId, timestamp, IP)
- Failed login attempts (email, reason, timestamp, IP)
- Token verification failures (reason, timestamp)
- User registration (userId, timestamp, IP)

Authorization events to log:
- Authorization failures (userId, resource, timestamp)
- Ownership validation failures (userId, resourceId, timestamp)
- OAuth state validation failures (reason, timestamp)

Security events to log:
- Unusual access patterns (rapid requests, unusual endpoints)
- Rate limit violations
- Token manipulation attempts
- Cross-user access attempts

### Alerting

Critical alerts:
- Authentication failure rate exceeds 10% over 5-minute window
- Cross-user access attempt detected
- OAuth state validation failure rate exceeds 5%
- Database query errors in authentication or authorization

Warning alerts:
- Authentication latency exceeds 500ms p95
- Token verification latency exceeds 100ms p95
- Rate limit triggering frequently

## Confidence Assessment

**Confidence Level: High**

**Confidence Basis:**

Strengths:
- Clear understanding of current architecture through code analysis
- Well-defined security vulnerabilities identified
- Proven patterns for token-based authentication
- Phased implementation approach reduces risk
- Backward compatibility strategy enables safe migration

Supporting Factors:
- JWT infrastructure already in place (jwt.ts utilities)
- Authentication middleware foundation exists (auth.middleware.ts)
- DriveAccount model properly structured for multi-account support
- Database schema supports secure architecture
- TypeScript provides compile-time safety for refactoring

Known Challenges:
- OAuth flow modifications require careful state management
- Frontend localStorage dependency needs systematic removal
- Testing cross-user access prevention requires comprehensive scenarios
- Google token refresh not currently implemented (optional enhancement)
