import { Request, Response, NextFunction } from "express";
import User from "../models/user.js";
import File from "../models/file.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { getUserById } from "../services/auth.service.js";
import driveAccount from "../models/driveAccount.js";
import { generateOAuthState } from "../utils/oauthState.js";
import {
  fetchDriveAccountFiles,
  fetchUserFilesService,
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
    const response = await fetchUserFilesService({
      userId: req.userId,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 50,
      search: req.query.search as string,
      driveId: req.query.driveId as string,
      driveStatus: req.query.driveStatus as string,
      mimeTypes: req.body.mimeTypes as string[],
    });
    console.log("mimeTypes in controller:", req.body.mimeTypes);
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
      return res.json({ files: [] });
    }
    // Fetch files from all connected drives
    const allFiles = [];
    for (const driveAccount of driveAccounts) {
      try {
        const files = await fetchDriveAccountFiles(driveAccount);
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

        await File.bulkWrite(bulkOps);
        return res.json({success: true, message: 'Files synchronized successfully.'});
      
      } catch (error) {
        console.error(
          `Error fetching files from drive account ${driveAccount._id}:`,
          error
        );
        continue; // Continue with other accounts
      }
    }


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
    console.log("getDriveThumbnail called with:", { fileId, accountId });
    if (!fileId || !accountId) {
      return res.status(400).json({ error: "fileId and accountId are required" });
    }

    // Load drive account from DB
    const account = await DriveAccount.findById(accountId);
    if (!account) return res.status(404).json({ error: "Drive account not found" });

    // Create an authenticated Google client
    const auth = createGoogleAuthClient(account);
    const drive = google.drive({ version: "v3", auth });

    // Get file metadata to retrieve thumbnailLink
    const metaResp: any = await drive.files.get({ fileId, fields: "thumbnailLink, mimeType" });
    const thumbnailLink: string | undefined = metaResp?.data?.thumbnailLink;
    const mimeType: string | undefined = metaResp?.data?.mimeType;

    if (!thumbnailLink) {
      return res.status(404).json({ error: "Thumbnail not available" });
    }

    // Ensure we have an access token (this will refresh if needed)
    const atRes: any = await (auth as any).getAccessToken();
    const token = typeof atRes === "string" ? atRes : atRes?.token || auth.credentials?.access_token;

    // Fetch the thumbnail via server-side request with Bearer token
    const axiosResp = await axios.get(thumbnailLink, {
      responseType: "stream",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 15000,
    });

    // Forward content-type and cache headers
    const contentType = axiosResp.headers["content-type"] || mimeType || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400"); // 24 hours

    // Pipe stream
    axiosResp.data.pipe(res);
  } catch (error) {
    console.error("getDriveThumbnail error:", error);
    res.status(500).json({ error: "Failed to fetch thumbnail" });
  }
};
