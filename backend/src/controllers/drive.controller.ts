import { Request, Response, NextFunction } from "express";
import User from "../models/user.js";
import DriveAccount from "../models/driveAccount.js";
import File from "../models/file.js";
import {
  fetchUserProfile,
  fetchDriveAccountFiles,
  fetchDriveQuotaFromGoogle,
} from "../services/drive.service.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import OAuthState from "../models/OAuthState.js";

export const getDriveFiles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Use userId from authenticated token, not from URL parameters
    const userId = req.userId!;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Get all drive accounts for this user
    const driveAccounts = await DriveAccount.find({ userId });

    if (driveAccounts.length === 0) {
      return res.json({ files: [] });
    }

    // Fetch files from all connected drives
    const allFiles = [];
    for (const driveAccount of driveAccounts) {
      try {
        const files = await fetchDriveAccountFiles(driveAccount);
        // Add drive account info to each file
        const filesWithDriveInfo = files.map((file) => ({
          ...file,
          driveAccountName: driveAccount.name,
          driveAccountEmail: driveAccount.email,
        }));
        allFiles.push(...filesWithDriveInfo);
      } catch (error) {
        console.error(
          `Error fetching files from drive account ${driveAccount._id}:`,
          error
        );
        continue; // Continue with other accounts
      }
    }

    res.json({ files: allFiles });
  } catch (error) {
    next(error);
  }
};

export const getMyProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("=============getMyProfile=============");
    // Use userId from authenticated token, not from URL parameters
    const userId = req.userId!;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Get the first connected drive account for this user to fetch profile
    const driveAccount = await DriveAccount.findOne({ userId });
    if (!driveAccount)
      return res.status(404).json({ error: "No drive accounts connected" });
    const profile = await fetchUserProfile(driveAccount);
    res.json(profile);
  } catch (err: any) {
    console.error("Error fetching profile:", err);
    next(err);
  }
};
const QUOTA_REFRESH_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Get all drive accounts for a user
export const getAllDriveAccounts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;

    const driveAccounts = await DriveAccount.find({ userId });

    const now = Date.now();

    // 🚀 Parallel, fault-tolerant refresh
    const refreshResults = await Promise.allSettled(
      driveAccounts.map(async (account) => {
        const lastFetched = account.lastFetched?.getTime() || 0;
        const isStale = now - lastFetched > QUOTA_REFRESH_TTL_MS;

        if (!isStale) return account;

        const quota = await fetchDriveQuotaFromGoogle({
          accessToken: account.accessToken,
          refreshToken: account.refreshToken,
        });

        account.used = quota.used;
        account.total = quota.total;
        account.lastFetched = new Date();

        await account.save();
        return account;
      })
    );

    // 🧼 Normalize results (ignore failed Google calls)
    const safeAccounts = refreshResults.map((result, index) =>
      result.status === "fulfilled"
        ? result.value
        : driveAccounts[index]
    );

    // 📊 Response mapping
    const accounts = safeAccounts.map((account) => {
      const used = account.used || 0;
      const total = account.total || 0;

      return {
        _id: account._id,
        name: account.name,
        email: account.email,
        connectionStatus: account.connectionStatus,
        scopes: account.scopes,
        profileImg:account.profileImg,
        storage: {
          used,
          total,
          remaining: total ? total - used : null,
          usagePercentage: total
            ? Math.round((used / total) * 100)
            : null,
        },

        lastSync: account.lastSync,
        lastFetched: account.lastFetched,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      };
    });

    res.json({
      count: accounts.length,
      accounts,
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
) => {
  try {
    const state = crypto.randomUUID();

    // Persist OAuth state
    OAuthState.create({
      state,
      userId: req.userId,
      purpose: "ADD_DRIVE",
    });
    // User must be authenticated - userId comes from token via middleware
    // The /auth/add-drive-account route now requires authentication
    // Return the backend auth URL that requires authentication
    const authUrl = `http://localhost:4000/auth/add-drive-account`;
    res.json({ authUrl });
  } catch (error) {
    next(error);
  }
};

// Remove a drive account
export const removeDriveAccount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const accountId = req.params.accountId;

    // First, verify ownership by checking if this account belongs to the authenticated user
    const account = await DriveAccount.findById(accountId);

    if (!account) {
      return res.status(404).json({ error: "Drive account not found" });
    }

    // Verify the account belongs to the authenticated user
    if (account.userId.toString() !== req.userId) {
      return res.status(403).json({
        error: "You do not have permission to remove this drive account",
      });
    }

    // Remove the drive account
    await DriveAccount.findByIdAndDelete(accountId);

    // Remove all files associated with this drive account
    await File.deleteMany({ driveAccountId: accountId });

    res.json({ message: "Drive account removed successfully" });
  } catch (error) {
    next(error);
  }
};

// Sync files from all connected drives
export const syncDriveFiles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Use userId from authenticated token
    const userId = req.userId!;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const driveAccounts = await DriveAccount.find({ userId });

    if (driveAccounts.length === 0) {
      return res.json({ message: "No drive accounts connected" });
    }

    let totalFilesSynced = 0;

    for (const driveAccount of driveAccounts) {
      try {
        // Fetch files from this drive account
        const files = await fetchDriveAccountFiles(driveAccount);

        // Update last sync time
        await DriveAccount.findByIdAndUpdate(driveAccount._id, {
          lastSync: new Date(),
          lastFetched: new Date(),
        });

        // Clear existing files for this account and add new ones
        await File.deleteMany({ driveAccountId: driveAccount._id });

        // Prepare files for bulk insert
        const filesToInsert = files.map((file) => ({
          driveAccountId: driveAccount._id,
          userId,
          googleFileId: file.id,
          name: file.name,
          mimeType: file.mimeType,
          webViewLink: file.webViewLink,
          webContentLink: file.webContentLink,
          iconLink: file.iconLink,
          createdTime: file.createdTime,
          modifiedTime: file.modifiedTime,
          size: file.size,
          owners: file.owners,
          parents: file.parents,
          starred: file.starred,
          trashed: file.trashed,
          shared: file.shared,
          description: file.description,
        }));

        if (filesToInsert.length > 0) {
          await File.insertMany(filesToInsert);
          totalFilesSynced += filesToInsert.length;
        }
      } catch (error) {
        console.error(
          `Error syncing drive account ${driveAccount._id}:`,
          error
        );
        // Update connection status to error
        await DriveAccount.findByIdAndUpdate(driveAccount._id, {
          connectionStatus: "error",
        });
        continue; // Continue with other accounts
      }
    }

    res.json({
      message: "Sync completed successfully",
      totalFilesSynced,
      accountsSynced: driveAccounts.length,
    });
  } catch (error) {
    next(error);
  }
};
