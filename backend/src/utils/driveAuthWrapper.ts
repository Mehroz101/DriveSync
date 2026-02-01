import { refreshAccessToken } from '../services/drive.service.js';
import { checkAccountStatus } from './driveAuthUtils.js';

/**
 * Higher-order function that wraps Drive API operations with authentication handling
 * This ensures consistent error handling across all Drive operations
 */
export const withDriveAuth = <T extends any[], R>(
  operation: (auth: any, ...args: T) => Promise<R>
) => {
  return async (accountId: string, ...args: T): Promise<R> => {
    // Check account status and get account (throws error if revoked)
    const account = await checkAccountStatus(accountId);
    
    // Get authenticated client (throws error if token refresh fails)
    const auth = await refreshAccessToken(account);
    
    // Execute the operation
    return await operation(auth, ...args);
  };
};

/**
 * Utility to wrap any async function with Drive auth error handling
 * Use this for operations that might encounter auth errors
 */
export const withAuthErrorHandling = <T extends any[], R>(
  operation: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await operation(...args);
    } catch (error) {
      // The error will be automatically handled by the error middleware
      // if it's a DriveAuthError, otherwise it will be passed through
      throw error;
    }
  };
};
