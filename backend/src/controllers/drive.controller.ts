import { Response, NextFunction } from "express";
import User from "../models/user.js";
import File from "../models/file.js";
import {
  fetchUserProfile,
  fetchDriveAccountFiles,
  fetchDriveQuotaFromGoogle,
  fetchDriveStats,
  updateDriveData,
  fetchDriveStatsFromDatabase,
  fetchMultipleDriveStatsFromDatabase,
} from "../services/drive.service.js";
import type { AuthenticatedRequest, DriveAccount, DriveFile } from "../types/index.js";
import { getUserById } from "../services/auth.service.js";
import driveAccount from "../models/driveAccount.js";
import { generateOAuthState } from "../utils/oauthState.js";
import axios from "axios";
import { DriveTokenExpiredError } from "../utils/driveAuthError.js";
import { sendSuccess, sendError, parseBoolean } from '../utils/apiResponse.js';

const QUOTA_REFRESH_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const getDriveFiles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Use userId from authenticated token, not from URL parameters
    const userId = req.userId!;
    const user = await User.findById(userId);
    if (!user) {
      sendError(res, "User not found", { statusCode: 404 });
      return;
    }

    // Get all drive accounts for this user
    const driveAccounts = await driveAccount.find({ userId });

    if (driveAccounts.length === 0) {
      sendSuccess<DriveFile[]>(res, []);
      return;
    }

    // Fetch files from all connected drives
    const allFiles: DriveFile[] = [];
    for (const account of driveAccounts) {
      try {
        const files = await fetchDriveAccountFiles(account);
        // Add drive account info to each file
        const filesWithDriveInfo = files.map((file) => ({
          ...file,
          driveAccount: {
            _id: account._id.toString(),
            email: account.email,
            name: account.name,
            connectionStatus: account.connectionStatus
          }
        })) as DriveFile[];
        allFiles.push(...filesWithDriveInfo);
      } catch (error) {
        console.error(
          `Error fetching files from drive account ${account._id}:`,
          error
        );
        
        // Check if this was a Drive auth error
        if (error instanceof DriveTokenExpiredError) {
          console.error(`🔴 Auth revoked for drive account ${error.accountEmail}`);
        }
        
        continue; // Continue with other accounts
      }
    }

    sendSuccess<DriveFile[]>(res, allFiles);
  } catch (error) {
    next(error);
  }
};

export const getMyProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Use userId from authenticated token, not from URL parameters
    const userId = req.userId!;
    const user = await User.findById(userId);
    if (!user) {
      sendError(res, "User not found", { statusCode: 404 });
      return;
    }

    // Get the first connected drive account for this user to fetch profile
    const driveAccountData = await driveAccount.findOne({ userId });
    if (!driveAccountData) {
      sendError(res, "No drive accounts connected", { statusCode: 404 });
      return;
    }
    
    const profile = await fetchUserProfile(driveAccountData);
    sendSuccess(res, profile);
  } catch (err) {
    console.error("Error fetching profile:", err);
    next(err);
  }
};

// Get all drive accounts for a user
export const getAllDriveAccounts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;

    const driveAccounts = await driveAccount.find({ userId });

    const now = Date.now();

    // 🚀 Parallel, fault-tolerant refresh
    const refreshResults = await Promise.allSettled(
      driveAccounts.map(async (account) => {
        const lastFetched = account.lastFetched?.getTime() || 0;
        const isStale = now - lastFetched > QUOTA_REFRESH_TTL_MS;

        if (!isStale) return account;

        const quota = await fetchDriveQuotaFromGoogle(account);

        account.used = quota.used;
        account.total = quota.total;
        account.lastFetched = new Date();

        await account.save();
        return account;
      })
    );

    // 🧼 Normalize results (ignore failed Google calls)
    const safeAccounts = refreshResults.map((result, index) =>
      result.status === "fulfilled" ? result.value : driveAccounts[index]
    );

    // 📊 Response mapping
    const accounts = safeAccounts.map((account) => {
      const used = account.used || 0;
      const total = account.total || 0;

      return {
        _id: account._id.toString(),
        userId: account.userId.toString(),
        connectionStatus: account.connectionStatus as "active" | "revoked" | "error" | "disconnected",
        owner: {
          displayName: account.name,
          emailAddress: account.email,
          name: account.name,
          email: account.email
        },
        storage: {
          used,
          total,
          usedInDrive: used,
          usedInTrash: 0,
          remaining: total ? total - used : 0,
        },
        stats: {
          totalFiles: 0,
          totalFolders: 0,
          trashedFiles: 0,
          duplicateFiles: 0,
          duplicateSize: 0,
          sharedFiles: 0,
          starredFiles: 0
        },
        meta: {
          fetchedAt: account.lastFetched?.toISOString() || new Date().toISOString(),
          source: 'google-drive-api'
        },
        lastSyncedAt: account.lastSync?.toISOString(),
        createdAt: account.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: account.updatedAt?.toISOString() || new Date().toISOString()
      } as DriveAccount;
    });

    sendSuccess(res, accounts, {
      meta: { total: accounts.length }
    });
  } catch (error) {
    next(error);
  }
};

// Add a new drive account (redirect to OAuth flow with authentication)
export const addDriveAccount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const state = generateOAuthState(userId);
    const authUrl = `${process.env.BACKEND_URL}/api/auth/add-drive-account?state=${state}`;

    sendSuccess(res, { authUrl });
  } catch (error) {
    next(error);
  }
};

// Remove a drive account
export const removeDriveAccount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const accountId = req.params.accountId;

    // First, verify ownership by checking if this account belongs to the authenticated user
    const account = await driveAccount.findById(accountId);

    if (!account) {
      sendError(res, "Drive account not found", { statusCode: 404 });
      return;
    }

    // Verify the account belongs to the authenticated user
    if (account.userId.toString() !== req.userId) {
      sendError(res, "You do not have permission to remove this drive account", { statusCode: 403 });
      return;
    }

    // Remove the drive account
    await driveAccount.findByIdAndDelete(accountId);

    // Remove all files associated with this drive account
    await File.deleteMany({ driveAccountId: accountId });

    sendSuccess(res, undefined, { message: "Drive account removed successfully" });
  } catch (error) {
    next(error);
  }
};

// Sync files from all connected drives
export const syncAllDrivesData = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const driveAccounts = await driveAccount.find({
      userId: req.userId!,
    });
    const stats = await Promise.allSettled(
      driveAccounts.map((account) => fetchDriveStats(account))
    );
    const filteredStats = stats
      .filter((stat) => stat.status === "fulfilled")
      .map((stat) => stat.value);
    
    sendSuccess<DriveAccount[]>(res, filteredStats);
  } catch (error) {
    next(error);
  }
};

export const syncDrive = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const driveId = req.params.driveId;
    const driveAccountData = await driveAccount.findById(driveId);
    if (!driveAccountData) {
      sendError(res, "Drive account not found", { statusCode: 404 });
      return;
    }
    const stats = await fetchDriveStats(driveAccountData);
    sendSuccess<DriveAccount>(res, stats);
  } catch (error) {
    next(error);
  }
};
export const getDriveAccountProfileImage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const accountId = req.query.accountId as string;

    if (!accountId) {
      sendError(res, "accountId is required", { statusCode: 400 });
      return;
    }

    // Load drive account from DB
    const account = await driveAccount.findById(accountId);
    if (!account) {
      sendError(res, "Drive account not found", { statusCode: 404 });
      return;
    }

    // Verify the account belongs to the authenticated user
    if (account.userId.toString() !== req.userId) {
      sendError(res, "You do not have permission to access this profile image", { statusCode: 403 });
      return;
    }

    const profileImgUrl = account.profileImg;
    if (!profileImgUrl) {
      sendError(res, "Profile image not available", { statusCode: 404 });
      return;
    }

    console.log(`📸 Fetching profile image from: ${profileImgUrl.substring(0, 50)}...`);

    // Fetch the profile image via server-side request
    const axiosResp = await axios.get(profileImgUrl, {
      responseType: "stream",
      timeout: 15000,
      validateStatus: (status) => status < 500,
    });

    if (axiosResp.status !== 200) {
      console.log(`❌ Failed to fetch profile image: HTTP ${axiosResp.status}`);
      sendError(res, `Failed to fetch profile image: ${axiosResp.statusText}`, { statusCode: axiosResp.status });
      return;
    }

    // Forward content-type and cache headers
    const contentType = axiosResp.headers["content-type"] || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400"); // 24 hours
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    console.log(`✅ Streaming profile image for account: ${accountId}`);

    // Pipe stream
    axiosResp.data.pipe(res);
  } catch (error) {
    console.error("getDriveAccountProfileImage error:", error);
    
    if (error instanceof Error) {
      sendError(res, `Failed to fetch profile image: ${error.message}`, { statusCode: 500 });
    } else {
      next(error);
    }
  }
};

export const driveStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await getUserById(req.userId!);
    const driveAccounts = await driveAccount.find({ userId: req.userId! });
    
    // Use optimized function that calculates global duplicates once
    const stats = await fetchMultipleDriveStatsFromDatabase(driveAccounts);
    
    // Return as generic unknown type since the service returns complex aggregated data
    sendSuccess(res, stats);
  } catch (error) {
    console.log(error);
    sendError(res, "Failed to fetch drive stats", { statusCode: 500 });
  }
};
