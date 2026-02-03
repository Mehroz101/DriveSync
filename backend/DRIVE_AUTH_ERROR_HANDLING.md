# Centralized Google Drive Authentication Error Handling

This document describes the centralized error handling system implemented for Google Drive authentication across the entire backend.

## Overview

The centralized error handling system provides consistent authentication error handling across all services and controllers that interact with Google Drive APIs. This eliminates duplicate error handling code and ensures consistent behavior when refresh tokens expire or accounts are revoked.

## Components

### 1. Custom Error Classes (`utils/driveAuthError.ts`)

```typescript
export class DriveAuthError extends Error {
  public readonly accountId: string;
  public readonly accountEmail: string;
  public readonly isAuthError: boolean = true;
  public readonly statusCode: number = 401;
}

export class DriveAccountRevokedError extends DriveAuthError
export class DriveTokenExpiredError extends DriveAuthError
```

These error classes provide structured error information that can be used by both the error middleware and frontend.

### 2. Utility Functions (`utils/driveAuthUtils.ts`)

- **`checkAccountStatus(accountId: string)`**: Validates that a Drive account exists and is not revoked
- **`handleTokenError(error, accountId, accountEmail)`**: Centralized token error handling that marks accounts as revoked
- **`isAuthError(error)`**: Utility to detect authentication-related errors

### 3. Error Middleware (`middleware/error.middleware.ts`)

The error middleware automatically handles `DriveAuthError` instances and returns properly formatted JSON responses:

```json
{
  "error": "Drive account authentication expired. Please reconnect your Google Drive account.",
  "needsReconnect": true,
  "accountId": "account_id_here",
  "accountEmail": "user@gmail.com"
}
```

### 4. Centralized `refreshAccessToken` Function

The `refreshAccessToken` function in `drive.service.ts` now:
- Automatically detects `invalid_grant` and other auth errors
- Marks accounts as "revoked" in the database
- Throws `DriveTokenExpiredError` with account details

## Usage Patterns

### Controllers

Controllers now use a simplified pattern:

```typescript
export const exampleController = async (req, res, next) => {
  try {
    const accountId = req.query.accountId;
    
    // Check account status (throws if revoked)
    const account = await checkAccountStatus(accountId);
    
    // Get authenticated client (throws if token refresh fails)
    const auth = await refreshAccessToken(account);
    
    // Use the authenticated client
    const drive = google.drive({ version: 'v3', auth });
    // ... rest of the logic
    
  } catch (error) {
    next(error); // Let error middleware handle it
  }
};
```

### Services

Services that use Google Drive APIs follow the same pattern:

```typescript
export const exampleService = async (driveAccount: any) => {
  try {
    const auth = await refreshAccessToken(driveAccount);
    // ... use auth for Google Drive calls
    
  } catch (error: any) {
    // Auth errors are automatically handled by refreshAccessToken
    // Just re-throw for the error middleware to handle
    throw error;
  }
};
```

## Error Flow

1. **Token Refresh Fails**: When `refreshAccessToken` encounters an `invalid_grant` error:
   - The account is marked as "revoked" in the database
   - A `DriveTokenExpiredError` is thrown with account details

2. **Error Propagation**: The error bubbles up through the service/controller call stack

3. **Middleware Handling**: The error middleware catches `DriveAuthError` instances and returns structured JSON responses

4. **Frontend Response**: The frontend receives a clear error with `needsReconnect: true` and account information

## Database Schema Update

The `DriveAccount` model now includes "revoked" as a valid `connectionStatus`:

```typescript
connectionStatus: {
  type: String,
  enum: ["active", "inactive", "error", "revoked"],
  default: "active",
}
```

## Benefits

1. **Consistency**: All authentication errors are handled the same way across the entire backend
2. **Maintainability**: Single point of change for auth error handling logic
3. **User Experience**: Clear, consistent error messages with actionable information
4. **Reliability**: Automatic account status management prevents stuck states

## Updated Files

### Core Components
- `utils/driveAuthError.ts` - Custom error classes
- `utils/driveAuthUtils.ts` - Utility functions
- `middleware/error.middleware.ts` - Error handling middleware
- `models/driveAccount.ts` - Updated schema

### Services
- `services/drive.service.ts` - Centralized `refreshAccessToken` and service functions

### Controllers
- `controllers/file.controller.ts` - File operations (upload, thumbnail, sync)
- `controllers/drive.controller.ts` - Drive operations

## Migration Notes

- All existing error handling patterns have been replaced with the centralized system
- The `refreshAccessToken` function is now the single source of truth for authentication
- Controllers and services are simplified to focus on business logic rather than error handling
- The error middleware automatically formats responses, so controllers just need to call `next(error)`

## Testing

When testing authentication errors:

1. **Simulate Token Expiration**: Use invalid refresh tokens to trigger `invalid_grant` errors
2. **Check Database Updates**: Verify that accounts are marked as "revoked" 
3. **Verify Error Responses**: Ensure consistent JSON structure with `needsReconnect: true`
4. **Test Error Propagation**: Confirm that errors bubble up correctly through the call stack
