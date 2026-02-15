import { Response, NextFunction } from "express";
import mongoose, { PipelineStage } from "mongoose";
import User from "../models/user.js";
import File from "../models/file.js";
import type { AuthenticatedRequest, DriveFile } from "../types/index.js";
import { getUserById } from "../services/auth.service.js";
import { logger } from "../utils/logger.js";
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
    logger.info("total drive accounts to sync:", driveAccounts.length);
    
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
        logger.info(`✅ Synced ${files.length} files from ${account.email}`);
      
      } catch (error) {
        syncResults.failedCount++;
        
        // Check if this was a Drive auth error using our new error classes
        if (error instanceof DriveTokenExpiredError) {
          syncResults.revokedAccounts.push({
            id: error.accountId,
            email: error.accountEmail,
          });
          logger.error(`🔴 Auth revoked for account ${error.accountEmail}`);
        } else {
          syncResults.errors.push({
            accountId: account._id.toString(),
            email: account.email,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          logger.error(`❌ Error syncing ${account.email}:`, error instanceof Error ? error.message : error);
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
    logger.info(error);
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
    
    logger.info(`📸 Fetching thumbnail for fileId: ${fileId}, accountId: ${accountId}`);
    
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
    logger.info(`🔍 Getting file metadata for fileId: ${fileId}`);
    const metaResp = await drive.files.get({
      fileId,
      fields: "thumbnailLink, mimeType, iconLink, hasThumbnail",
    });
    
    logger.info(`📋 File metadata:`, {
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
      logger.info(`❌ No thumbnail or icon available for fileId: ${fileId}`);
      sendError(res, "Thumbnail not available for this file type", { statusCode: 404 });
      return;
    }

    // Get the current access token for the thumbnail request
    const token = auth.credentials?.access_token;

    logger.info(`⬇️ Fetching image from: ${imageUrl.substring(0, 50)}...`);
    
    // Fetch the thumbnail via server-side request with Bearer token
    const axiosResp = await axios.get(imageUrl, {
      responseType: "stream",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 15000,
      validateStatus: (status) => status < 500, // Don't throw on 404
    });

    if (axiosResp.status !== 200) {
      logger.info(`❌ Failed to fetch thumbnail: HTTP ${axiosResp.status}`);
      sendError(res, `Failed to fetch thumbnail: ${axiosResp.statusText}`, { statusCode: axiosResp.status });
      return;
    }

    // Forward content-type and cache headers
    const contentType =
      axiosResp.headers["content-type"] || mimeType || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400"); // 24 hours
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    logger.info(`✅ Streaming thumbnail for fileId: ${fileId}`);
    
    // Pipe stream
    axiosResp.data.pipe(res);
  } catch (error) {
    logger.error("getDriveThumbnail error:", error);
    
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
    
    logger.info("deleteFiles called with data:", data);
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
    logger.error('Upload error:', error);
    next(error); // Let the error middleware handle it
  }
};

/**
 * Get folder contents - returns files and subfolders within a given parent folder.
 * If no parentId is provided, returns root-level items (items with no parents or parent='root').
 */
export const getFolderContents = async (
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
    const parentId = req.query.parentId as string | undefined;
    const driveId = req.query.driveId as string | undefined;

    const matchStage: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(req.userId),
      trashed: { $ne: true },
    };

    if (driveId) {
      matchStage.driveAccountId = new mongoose.Types.ObjectId(driveId);
    }

    if (parentId && parentId !== 'root') {
      // Get files whose parents array contains this parentId
      matchStage.parents = parentId;
    } else {
      // Root level: files with empty parents or parents containing only unknown IDs
      // Since Google Drive root files have parents = [root-folder-id], we match
      // items that are NOT inside any known subfolder
      // For root: get folders first, then files that have no parent or parent is a drive root
      matchStage.$or = [
        { parents: { $size: 0 } },
        { parents: { $exists: false } },
      ];
    }

    const skip = (page - 1) * limit;

    // Sort: folders first, then by name
    const pipeline: any[] = [
      { $match: matchStage },
      {
        $addFields: {
          isFolder: {
            $eq: ["$mimeType", "application/vnd.google-apps.folder"],
          },
        },
      },
      { $sort: { isFolder: -1 as const, name: 1 as const } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "driveaccounts",
                localField: "driveAccountId",
                foreignField: "_id",
                as: "drive",
              },
            },
            { $unwind: { path: "$drive", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                googleFileId: 1,
                name: 1,
                mimeType: 1,
                modifiedTime: 1,
                size: 1,
                starred: 1,
                trashed: 1,
                shared: 1,
                webViewLink: 1,
                webContentLink: 1,
                driveAccountId: 1,
                owners: 1,
                iconLink: 1,
                thumbnailUrl: 1,
                parents: 1,
                isFolder: 1,
                "drive.email": 1,
                "drive.connectionStatus": 1,
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await File.aggregate(pipeline);
    const files = result[0].data;
    const totalFiles = result[0].totalCount[0]?.count || 0;

    // Also get the breadcrumb trail for the current folder
    let breadcrumbs: { id: string; name: string }[] = [];
    if (parentId && parentId !== 'root') {
      breadcrumbs = await buildBreadcrumbs(req.userId, parentId);
    }

    sendPaginatedSuccess(res, files, {
      page,
      limit,
      total: totalFiles,
      totalPages: Math.ceil(totalFiles / limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get files inside a specific folder by its googleFileId
 */
export const getFilesByParent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.userId) {
      sendError(res, "Unauthorized", { statusCode: 401 });
      return;
    }

    const parentGoogleId = req.params.parentId;
    const { page, limit } = normalizePagination(req.query);
    const driveId = req.query.driveId as string | undefined;
    const skip = (page - 1) * limit;

    const matchStage: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(req.userId),
      trashed: { $ne: true },
      parents: parentGoogleId,
    };

    if (driveId) {
      matchStage.driveAccountId = new mongoose.Types.ObjectId(driveId);
    }

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $addFields: {
          isFolder: {
            $eq: ["$mimeType", "application/vnd.google-apps.folder"],
          },
        },
      },
      { $sort: { isFolder: -1 as const, name: 1 as const } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "driveaccounts",
                localField: "driveAccountId",
                foreignField: "_id",
                as: "drive",
              },
            },
            { $unwind: { path: "$drive", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                googleFileId: 1,
                name: 1,
                mimeType: 1,
                modifiedTime: 1,
                size: 1,
                starred: 1,
                trashed: 1,
                shared: 1,
                webViewLink: 1,
                webContentLink: 1,
                driveAccountId: 1,
                owners: 1,
                iconLink: 1,
                thumbnailUrl: 1,
                parents: 1,
                isFolder: 1,
                "drive.email": 1,
                "drive.connectionStatus": 1,
              },
            },
          ],
          totalCount: [{ $count: "count" }],
          folderCount: [
            { $match: { mimeType: "application/vnd.google-apps.folder" } },
            { $count: "count" },
          ],
        },
      },
    ];

    const result = await File.aggregate(pipeline);
    const files = result[0].data;
    const totalFiles = result[0].totalCount[0]?.count || 0;

    // Get breadcrumb trail
    const breadcrumbs = await buildBreadcrumbs(req.userId, parentGoogleId);

    sendSuccess(res, {
      files,
      breadcrumbs,
      pagination: {
        page,
        limit,
        totalFiles,
        totalPages: Math.ceil(totalFiles / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Proxy file content from Google Drive for preview (images, video, audio).
 * Google doesn't allow direct embedding from their domain, so we proxy it.
 */
export const proxyFileContent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.userId) {
      sendError(res, "Unauthorized", { statusCode: 401 });
      return;
    }

    const googleFileId = req.params.fileId;
    const accountId = req.query.accountId as string;

    if (!googleFileId || !accountId) {
      sendError(res, "fileId and accountId are required", { statusCode: 400 });
      return;
    }

    // Verify the file belongs to this user
    const fileDoc = await File.findOne({
      userId: req.userId,
      googleFileId,
      driveAccountId: accountId,
    });

    if (!fileDoc) {
      sendError(res, "File not found", { statusCode: 404 });
      return;
    }

    const account = await checkAccountStatus(accountId);
    const auth = await refreshAccessToken(account);
    const drive = google.drive({ version: "v3", auth });

    // Get file metadata to determine mime type
    const meta = await drive.files.get({
      fileId: googleFileId,
      fields: "mimeType, size, name",
    });

    const mimeType = meta.data.mimeType || "application/octet-stream";
    const fileSize = parseInt(meta.data.size || "0", 10);

    // Handle range requests for video/audio streaming
    const range = req.headers.range;

    if (range && fileSize > 0) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 5 * 1024 * 1024, fileSize - 1); // 5MB chunks
      const chunkSize = end - start + 1;

      const response = await drive.files.get(
        { fileId: googleFileId, alt: "media" },
        {
          responseType: "stream",
          headers: { Range: `bytes=${start}-${end}` },
        }
      );

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=3600",
      });

      (response.data as NodeJS.ReadableStream).pipe(res);
    } else {
      // Full file download for images and small files
      const response = await drive.files.get(
        { fileId: googleFileId, alt: "media" },
        { responseType: "stream" }
      );

      res.setHeader("Content-Type", mimeType);
      if (fileSize > 0) {
        res.setHeader("Content-Length", fileSize);
      }
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

      (response.data as NodeJS.ReadableStream).pipe(res);
    }
  } catch (error) {
    logger.error("proxyFileContent error:", { error: (error as Error).message });
    if (!res.headersSent) {
      sendError(res, "Failed to stream file content", { statusCode: 500 });
    }
  }
};

/**
 * Build breadcrumb trail for folder navigation
 */
async function buildBreadcrumbs(
  userId: string,
  googleFileId: string,
  maxDepth = 10
): Promise<{ id: string; name: string }[]> {
  const trail: { id: string; name: string }[] = [];
  let currentId = googleFileId;

  for (let i = 0; i < maxDepth; i++) {
    const folder = await File.findOne({
      userId,
      googleFileId: currentId,
      mimeType: "application/vnd.google-apps.folder",
    }).lean();

    if (!folder) break;

    trail.unshift({ id: folder.googleFileId, name: folder.name });

    if (!folder.parents || folder.parents.length === 0) break;
    currentId = folder.parents[0];
  }

  return trail;
}
