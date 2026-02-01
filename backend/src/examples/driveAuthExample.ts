/**
 * Example of how to implement a new controller/service using the centralized
 * Google Drive authentication error handling system
 */

import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { Response, NextFunction } from "express";
import { google } from "googleapis";
import { checkAccountStatus } from "../utils/driveAuthUtils.js";
import { refreshAccessToken } from "../services/drive.service.js";

// CONTROLLER EXAMPLE
export const exampleDriveController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { accountId, fileId } = req.query;
    
    if (!accountId || !fileId) {
      return res.status(400).json({ error: "accountId and fileId are required" });
    }

    // 1. Check account status (throws DriveAccountRevokedError if revoked)
    const account = await checkAccountStatus(accountId as string);
    
    // 2. Get authenticated client (throws DriveTokenExpiredError if refresh fails)
    const auth = await refreshAccessToken(account);
    
    // 3. Use the authenticated client for Google Drive operations
    const drive = google.drive({ version: "v3", auth });
    const fileResponse = await drive.files.get({
      fileId: fileId as string,
      fields: "id, name, size, mimeType"
    });

    res.json({
      success: true,
      file: fileResponse.data
    });

  } catch (error) {
    // 4. Let the error middleware handle all errors (including auth errors)
    next(error);
  }
};

// SERVICE EXAMPLE
export const exampleDriveService = async (driveAccount: any, fileId: string) => {
  try {
    // 1. Get authenticated client (throws DriveTokenExpiredError if refresh fails)
    const auth = await refreshAccessToken(driveAccount);
    
    // 2. Use the authenticated client
    const drive = google.drive({ version: "v3", auth });
    const response = await drive.files.get({ fileId });
    
    return response.data;
    
  } catch (error: any) {
    // 3. Auth errors are automatically handled by refreshAccessToken
    // Just re-throw for the error middleware to handle
    console.error(`Error in example service for ${driveAccount.email}:`, error.message);
    throw error;
  }
};

// SYNC/BATCH OPERATION EXAMPLE (like getAllDriveFilesSync)
export const exampleBatchSync = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    
    // Get all drive accounts
    const driveAccounts = await DriveAccount.find({
      userId,
      connectionStatus: "active",
    });

    const syncResults = {
      successCount: 0,
      failedCount: 0,
      revokedAccounts: [] as { id: string; email: string }[],
      errors: [] as { accountId: string; email: string; error: string }[],
    };

    // Process each account
    for (const account of driveAccounts) {
      try {
        // Use the service function (which handles auth internally)
        const result = await exampleDriveService(account, "some-file-id");
        syncResults.successCount++;
        
      } catch (error: any) {
        syncResults.failedCount++;
        
        // Check if this was a Drive auth error using our new error classes
        if (error instanceof DriveTokenExpiredError) {
          syncResults.revokedAccounts.push({
            id: error.accountId,
            email: error.accountEmail,
          });
        } else {
          syncResults.errors.push({
            accountId: account._id.toString(),
            email: account.email,
            error: error.message || 'Unknown error',
          });
        }
        continue; // Continue with other accounts
      }
    }

    res.json({
      success: syncResults.successCount > 0,
      syncResults
    });

  } catch (error) {
    next(error);
  }
};

/**
 * KEY PRINCIPLES:
 * 
 * 1. Always use checkAccountStatus() before operations if you have an accountId
 * 2. Always use refreshAccessToken() to get authenticated clients
 * 3. Let errors bubble up - don't catch auth errors manually
 * 4. Use next(error) in controllers to let error middleware handle responses
 * 5. In batch operations, catch specific error types (DriveTokenExpiredError)
 * 6. Focus on business logic - let the centralized system handle auth concerns
 */
