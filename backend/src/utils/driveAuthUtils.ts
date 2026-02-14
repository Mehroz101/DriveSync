import DriveAccount from '../models/driveAccount.js';
import { DriveAccountRevokedError, DriveTokenExpiredError } from './driveAuthError.js';

/**
 * Utility function to check if an account is revoked and throw appropriate error
 */
export const checkAccountStatus = async (accountId: string) => {
  const account = await DriveAccount.findById(accountId);
  if (!account) {
    throw new Error(`Drive account not found for ${accountId}`);
  }

  if (account.connectionStatus === 'revoked') {
    throw new DriveAccountRevokedError(account._id.toString(), account.email);
  }

  return account;
};

/**
 * Utility function to handle auth token errors and mark accounts as revoked
 */
export const handleTokenError = async (error: any, accountId: string, accountEmail: string) => {
  // Check if this is an auth revocation error
  if (
    error.code === 400 ||
    error.message?.includes('invalid_grant') ||
    error.response?.data?.error === 'invalid_grant' ||
    /token.*(?:revoked|expired)/i.test(error.message || '')
  ) {
    // Mark account as revoked in the database
    try {
      await DriveAccount.findByIdAndUpdate(accountId, {
        connectionStatus: 'revoked',
        accessToken: null,
      });
      console.error(`🔴 Marked account ${accountEmail} as revoked due to invalid_grant`);
    } catch (updateError) {
      console.error('Failed to mark account as revoked in DB:', updateError);
    }
    
    throw new DriveTokenExpiredError(accountId, accountEmail);
  }

  // For other errors, just re-throw
  throw error;
};

/**
 * Utility function to detect if an error is authentication related
 */
export const isAuthError = (error: any): boolean => {
  return (
    error.code === 401 ||
    error.code === 400 ||
    error.message?.includes('invalid_grant') ||
    error.message?.includes('authentication expired') ||
    error.message?.includes('token') ||
    error.response?.data?.error === 'invalid_grant' ||
    /unauthorized|token.*(?:revoked|expired)/i.test(error.message || '')
  );
};
