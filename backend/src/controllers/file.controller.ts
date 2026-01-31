import { Request, Response, NextFunction } from "express";
import User from "../models/user.js";
import File from "../models/file.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { getUserById } from "../services/auth.service.js";
import driveAccount from "../models/driveAccount.js";
import { generateOAuthState } from "../utils/oauthState.js";
import {
  deleteFilesService,
  fetchDriveAccountFiles,
  fetchUserFilesService,
  permanentlyDeleteTrashedFilesService,
} from "../services/drive.service.js";
import axios from "axios";
import { google } from "googleapis";
import { createGoogleAuthClient } from "../utils/googleAuth.js";
import DriveAccount from "../models/driveAccount.js";

const QUOTA_REFRESH_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const getAllDriveFiles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Parse boolean query params
    const parseBoolean = (val: any): boolean | undefined => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    };

    const response = await fetchUserFilesService({
      userId: req.userId,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 50,
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
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getAllDriveFilesSync = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Use userId from authenticated token, not from URL parameters
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userId = req.userId!;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Get all drive accounts for this user
    const driveAccounts = await driveAccount.find({
      userId,
      connectionStatus: "active",
    });
    if (driveAccounts.length === 0) {
      return res.json({ files: [], message: "No active drive accounts found" });
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
              driveAccountId: file.driveAccountId,
            },
            update: { $set: file },
            upsert: true,
          },
        }));

        if (bulkOps.length > 0) {
          await File.bulkWrite(bulkOps);
        }
        syncResults.successCount++;
        console.log(`✅ Synced ${files.length} files from ${account.email}`);
      
      } catch (error: any) {
        syncResults.failedCount++;
        
        // Check if this was an auth error (account already marked as revoked by service)
        if (error.isAuthError) {
          syncResults.revokedAccounts.push({
            id: error.accountId || account._id.toString(),
            email: error.accountEmail || account.email,
          });
          console.error(`🔴 Auth revoked for account ${account.email}`);
        } else {
          syncResults.errors.push({
            accountId: account._id.toString(),
            email: account.email,
            error: error.message || 'Unknown error',
          });
          console.error(`❌ Error syncing ${account.email}:`, error.message);
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

    return res.json({
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
) => {
  try {
    const fileId = req.query.fileId as string;
    const accountId = req.query.accountId as string;
    if (!fileId || !accountId) {
      return res
        .status(400)
        .json({ error: "fileId and accountId are required" });
    }

    // Load drive account from DB
    const account = await DriveAccount.findById(accountId);
    if (!account)
      return res.status(404).json({ error: "Drive account not found" });

    // Create an authenticated Google client
    const auth = createGoogleAuthClient(account);
    const drive = google.drive({ version: "v3", auth });

    // Get file metadata to retrieve thumbnailLink
    const metaResp: any = await drive.files.get({
      fileId,
      fields: "thumbnailLink, mimeType",
    });
    const thumbnailLink: string | undefined = metaResp?.data?.thumbnailLink;
    const mimeType: string | undefined = metaResp?.data?.mimeType;

    if (!thumbnailLink) {
      return res.status(404).json({ error: "Thumbnail not available" });
    }

    // Ensure we have an access token (this will refresh if needed)
    const atRes: any = await (auth as any).getAccessToken();
    const token =
      typeof atRes === "string"
        ? atRes
        : atRes?.token || auth.credentials?.access_token;

    // Fetch the thumbnail via server-side request with Bearer token
    const axiosResp = await axios.get(thumbnailLink, {
      responseType: "stream",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 15000,
    });

    // Forward content-type and cache headers
    const contentType =
      axiosResp.headers["content-type"] || mimeType || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400"); // 24 hours

    // Pipe stream
    axiosResp.data.pipe(res);
  } catch (error) {
    console.error("getDriveThumbnail error:", error);
    res.status(500).json({ error: "Failed to fetch thumbnail" });
  }
};

export const deleteFiles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const data = req.body;  
//     [
//   {
//     fileId: '6974d8cb732e5d1adaf76709',
//     driveId: '695a881ca46176c009a58da2'
//   },
//   {
//     fileId: '6974d8cb732e5d1adaf7670e',
//     driveId: '695a881ca46176c009a58da2'
//   }
// ]
    console.log("deleteFiles called with data:", data);
    if (!Array.isArray(data) || data.length === 0) {
      return res
        .status(400)
        .json({ error: "Request body must be a non-empty array" });
    }
    const response  = await deleteFilesService(req.userId, data);
    res.json(response);
  
  } catch (error) {
    next(error);
  }
};

export const permanentlyDeleteTrashedFiles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const data = req.body;
    if (!Array.isArray(data) || data.length === 0) {
      return res
        .status(400)
        .json({ error: "Request body must be a non-empty array" });
    }
    const response = await permanentlyDeleteTrashedFilesService(req.userId, data);
    res.json(response);

  } catch (error) {
    next(error);
  }
};
