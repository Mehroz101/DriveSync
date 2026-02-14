import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import User from "../models/user.js";
import File from "../models/file.js";
import type { AuthenticatedRequest, DriveFile } from "../types/index.js";
import { getUserById } from "../services/auth.service.js";
import driveAccount from "../models/driveAccount.js";
import { generateOAuthState } from "../utils/oauthState.js";
import {
  deleteFilesService,
  fetchDriveAccountFiles,
  fetchUserFilesService,
  permanentlyDeleteTrashedFilesService,
  refreshAccessToken,
} from "../services/drive.service.js";
import axios from "axios";
import { google } from "googleapis";
import { createGoogleAuthClient } from "../utils/googleAuth.js";
import DriveAccount from "../models/driveAccount.js";
import { Readable } from 'stream';
import { checkAccountStatus } from "../utils/driveAuthUtils.js";
import { DriveTokenExpiredError } from "../utils/driveAuthError.js";
import { sendSuccess, sendError, normalizePagination, sendPaginatedSuccess, parseBoolean } from '../utils/apiResponse.js';
import type { BulkWriteOperation } from "../types/index.js";

const QUOTA_REFRESH_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const getAllDriveFiles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.userId) {
      sendError(res, "Unauthorized", { statusCode: 401 });
      return;
    }
    
    const { page, limit } = normalizePagination(req.query);

    const response = await fetchUserFilesService({
      userId: req.userId,
      page,
      limit,
      search: req.query.search as string,
      driveId: req.query.driveId as string,
      driveStatus: req.query.driveStatus as string,
      mimeTypes: req.body.mimeTypes as string[],
      // Tag filters
      shared: parseBoolean(req.query.shared),
      starred: parseBoolean(req.query.starred),
      trashed: parseBoolean(req.query.trashed),
      // Size filters
      sizeMin: req.query.sizeMin ? Number(req.query.sizeMin) : undefined,
      sizeMax: req.query.sizeMax ? Number(req.query.sizeMax) : undefined,
      // Date filter
      modifiedAfter: req.query.modifiedAfter as string,
    });
    
    sendPaginatedSuccess<DriveFile>(res, response.files as DriveFile[], {
      page: response.pagination.page,
      limit: response.pagination.limit,
      total: response.pagination.totalFiles,
      totalPages: response.pagination.totalPages
    });
  } catch (error) {
    next(error);
  }
};

export const getAllDriveFilesSync = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Use userId from authenticated token, not from URL parameters
    if (!req.userId) {
      sendError(res, "Unauthorized", { statusCode: 401 });
      return;
    }
    const userId = req.userId!;
    const user = await User.findById(userId);
    if (!user) {
      sendError(res, "User not found", { statusCode: 404 });
      return;
    }

    // Get all drive accounts for this user
    const driveAccounts = await driveAccount.find({
      userId,
      connectionStatus: "active",
    });
    if (driveAccounts.length === 0) {
      sendSuccess(res, { files: [] }, { message: "No active drive accounts found" });
      return;
    }
    console.log("total drive accounts to sync:", driveAccounts.length);
    
    // Track sync results
    const syncResults = {
      successCount: 0,
      failedCount: 0,
      revokedAccounts: [] as { id: string; email: string }[],
      errors: [] as { accountId: string; email: string; error: string }[],
    };

    // Fetch files from all connected drives
    for (const account of driveAccounts) {
      try {
        const files = await fetchDriveAccountFiles(account);
        const bulkOps = files.map((file) => ({
          updateOne: {
            filter: {
              googleFileId: file.googleFileId,
              driveAccountId: typeof file.driveAccountId === 'string' ? new mongoose.Types.ObjectId(file.driveAccountId) : file.driveAccountId,
            },
            update: { $set: {
              name: file.name || '',
              mimeType: file.mimeType || '',
              webViewLink: file.webViewLink || null,
              webContentLink: file.webContentLink || null,
              iconLink: file.iconLink || null,
              thumbnailUrl: file.thumbnailUrl || null,
              createdTime: file.createdTime || null,
              modifiedTime: file.modifiedTime || null,
              size: file.size ? Number(file.size) : 0,
              owners: (file.owners || []).map(owner => ({
                displayName: owner.displayName || null,
                emailAddress: owner.emailAddress || null,
              })),
              parents: file.parents || [],
              starred: file.starred || false,
              trashed: file.trashed || false,
              shared: file.shared || false,
              isDuplicate: false,
              description: file.description || '',
              userId: typeof file.userId === 'string' ? new mongoose.Types.ObjectId(file.userId) : file.userId,
              driveAccountId: typeof file.driveAccountId === 'string' ? new mongoose.Types.ObjectId(file.driveAccountId) : file.driveAccountId,
              googleFileId: file.googleFileId || '',
            }},
            upsert: true,
          },
        }));

        if (bulkOps.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await File.bulkWrite(bulkOps as any);
        }
        syncResults.successCount++;
        console.log(`✅ Synced ${files.length} files from ${account.email}`);
      
      } catch (error) {
        syncResults.failedCount++;
        
        // Check if this was a Drive auth error using our new error classes
        if (error instanceof DriveTokenExpiredError) {
          syncResults.revokedAccounts.push({
            id: error.accountId,
            email: error.accountEmail,
          });
          console.error(`🔴 Auth revoked for account ${error.accountEmail}`);
        } else {
          syncResults.errors.push({
            accountId: account._id.toString(),
            email: account.email,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          console.error(`❌ Error syncing ${account.email}:`, error instanceof Error ? error.message : error);
        }
        continue; // Continue with other accounts
      }
    }

    // Build response message
    let message = `Sync completed: ${syncResults.successCount} account(s) synced successfully`;
    if (syncResults.failedCount > 0) {
      message += `, ${syncResults.failedCount} failed`;
    }
    if (syncResults.revokedAccounts.length > 0) {
      message += `. ${syncResults.revokedAccounts.length} account(s) need reconnection.`;
    }

    sendSuccess(res, {
      success: syncResults.successCount > 0 || syncResults.failedCount === 0,
      message,
      syncResults,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

export const getDriveThumbnail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const fileId = req.query.fileId as string;
    const accountId = req.query.accountId as string;
    
    console.log(`📸 Fetching thumbnail for fileId: ${fileId}, accountId: ${accountId}`);
    
    if (!fileId || !accountId) {
      sendError(res, "fileId and accountId are required", { statusCode: 400 });
      return;
    }

    // Check account status and get account (throws error if revoked)
    const account = await checkAccountStatus(accountId);

    // Create an authenticated Google client with fresh tokens
    const auth = await refreshAccessToken(account);
    if (!auth) {
      sendError(res, "Failed to authenticate with Google Drive", { statusCode: 401 });
      return;
    }
    
    const drive = google.drive({ version: "v3", auth });

    // Get file metadata to retrieve thumbnailLink
    console.log(`🔍 Getting file metadata for fileId: ${fileId}`);
    const metaResp = await drive.files.get({
      fileId,
      fields: "thumbnailLink, mimeType, iconLink, hasThumbnail",
    });
    
    console.log(`📋 File metadata:`, {
      thumbnailLink: metaResp?.data?.thumbnailLink,
      mimeType: metaResp?.data?.mimeType,
      iconLink: metaResp?.data?.iconLink,
      hasThumbnail: metaResp?.data?.hasThumbnail
    });
    
    const thumbnailLink = metaResp?.data?.thumbnailLink as string | undefined;
    const mimeType = metaResp?.data?.mimeType as string | undefined;
    const iconLink = metaResp?.data?.iconLink as string | undefined;

    // Try thumbnail first, fallback to icon
    const imageUrl = thumbnailLink || iconLink;
    
    if (!imageUrl) {
      console.log(`❌ No thumbnail or icon available for fileId: ${fileId}`);
      sendError(res, "Thumbnail not available for this file type", { statusCode: 404 });
      return;
    }

    // Get the current access token for the thumbnail request
    const token = auth.credentials?.access_token;

    console.log(`⬇️ Fetching image from: ${imageUrl.substring(0, 50)}...`);
    
    // Fetch the thumbnail via server-side request with Bearer token
    const axiosResp = await axios.get(imageUrl, {
      responseType: "stream",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 15000,
      validateStatus: (status) => status < 500, // Don't throw on 404
    });

    if (axiosResp.status !== 200) {
      console.log(`❌ Failed to fetch thumbnail: HTTP ${axiosResp.status}`);
      sendError(res, `Failed to fetch thumbnail: ${axiosResp.statusText}`, { statusCode: axiosResp.status });
      return;
    }

    // Forward content-type and cache headers
    const contentType =
      axiosResp.headers["content-type"] || mimeType || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400"); // 24 hours
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    console.log(`✅ Streaming thumbnail for fileId: ${fileId}`);
    
    // Pipe stream
    axiosResp.data.pipe(res);
  } catch (error) {
    console.error("getDriveThumbnail error:", error);
    
    if (error instanceof Error) {
      sendError(res, `Failed to get thumbnail: ${error.message}`, { statusCode: 500 });
    } else {
      next(error);
    }
  }
};

export const deleteFiles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.userId) {
      sendError(res, "Unauthorized", { statusCode: 401 });
      return;
    }
    const data = req.body;
    
    console.log("deleteFiles called with data:", data);
    if (!Array.isArray(data) || data.length === 0) {
      sendError(res, "Request body must be a non-empty array", { statusCode: 400 });
      return;
    }
    
    const response = await deleteFilesService(req.userId, data);
    sendSuccess(res, response);
  } catch (error) {
    next(error);
  }
};

export const permanentlyDeleteTrashedFiles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.userId) {
      sendError(res, "Unauthorized", { statusCode: 401 });
      return;
    }
    const data = req.body;
    if (!Array.isArray(data) || data.length === 0) {
      sendError(res, "Request body must be a non-empty array", { statusCode: 400 });
      return;
    }
    const response = await permanentlyDeleteTrashedFilesService(req.userId, data);
    sendSuccess(res, response);
  } catch (error) {
    next(error);
  }
};

export const uploadFile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.userId) {
      sendError(res, "Unauthorized", { statusCode: 401 });
      return;
    }

    const { driveId } = req.body;
    const file = req.file;

    if (!driveId || !file) {
      sendError(res, "Drive ID and file are required", { statusCode: 400 });
      return;
    }

    // Check account status and get account (throws error if revoked)
    const driveAccount = await checkAccountStatus(driveId);

    // Verify the account belongs to the user
    if (driveAccount.userId.toString() !== req.userId) {
      sendError(res, "Access denied", { statusCode: 403 });
      return;
    }

    // Create Google Drive client with fresh tokens
    const auth = await refreshAccessToken(driveAccount);
    const drive = google.drive({ version: 'v3', auth });

    // Upload file to Google Drive
    const response = await drive.files.create({
      requestBody: {
        name: file.originalname,
        parents: ['root'],
      },
      media: {
        mimeType: file.mimetype,
        body: Readable.from(file.buffer),
      },
    });

    // Save file metadata to database
    const newFile = new File({
      userId: req.userId,
      driveAccountId: driveId,
      googleFileId: response.data.id,
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      webViewLink: response.data.webViewLink,
      iconLink: response.data.iconLink,
      thumbnailLink: response.data.thumbnailLink,
      modifiedTime: response.data.modifiedTime,
      createdTime: response.data.createdTime,
      shared: response.data.shared || false,
      starred: response.data.starred || false,
      trashed: response.data.trashed || false,
    });

    await newFile.save();

    sendSuccess(res, {
      success: true,
      file: newFile,
    });
  } catch (error) {
    console.error('Upload error:', error);
    next(error); // Let the error middleware handle it
  }
};
