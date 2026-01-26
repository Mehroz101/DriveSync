import { Request, Response, NextFunction } from "express";
import User from "../models/user.js";
import File from "../models/file.js";
import {
  fetchUserProfile,
  fetchDriveAccountFiles,
  fetchDriveQuotaFromGoogle,
  fetchDriveStats,
  updateDriveData,
  fetchDriveStatsFromDatabase,
} from "../services/drive.service.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { getUserById } from "../services/auth.service.js";
import driveAccount from "../models/driveAccount.js";
import { generateOAuthState } from "../utils/oauthState.js";
const QUOTA_REFRESH_TTL_MS = 10 * 60 * 1000; // 10 minutes

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
    const driveAccounts = await driveAccount.find({ userId });

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
    // Use userId from authenticated token, not from URL parameters
    const userId = req.userId!;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Get the first connected drive account for this user to fetch profile
    const driveAccountData = await driveAccount.findOne({ userId });
    if (!driveAccountData)
      return res.status(404).json({ error: "No drive accounts connected" });
    const profile = await fetchUserProfile(driveAccountData);
    res.json(profile);
  } catch (err: any) {
    console.error("Error fetching profile:", err);
    next(err);
  }
};

// Get all drive accounts for a user
export const getAllDriveAccounts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
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
        _id: account._id,
        name: account.name,
        email: account.email,
        connectionStatus: account.connectionStatus,
        scopes: account.scopes,
        profileImg: account.profileImg,
        storage: {
          used,
          total,
          remaining: total ? total - used : null,
          usagePercentage: total ? Math.round((used / total) * 100) : null,
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
    try {
      const userId = req.userId!;
      const state = generateOAuthState(userId);
      const authUrl = `${process.env.BACKEND_URL}/api/auth/add-drive-account?state=${state}`;

      res.json({ authUrl });
    } catch (error) {
      next(error);
    }
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
    const account = await driveAccount.findById(accountId);

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
    await driveAccount.findByIdAndDelete(accountId);

    // Remove all files associated with this drive account
    await File.deleteMany({ driveAccountId: accountId });

    res.json({ message: "Drive account removed successfully" });
  } catch (error) {
    next(error);
  }
};

// Sync files from all connected drives
export const syncAllDrivesData = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
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
    return res.status(200).json(filteredStats);
  } catch (error) {
    next(error);
  }
};
export const syncDrive = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const driveId = req.params.driveId;
    const driveAccountData = await driveAccount.findById(driveId);
    if (!driveAccountData) {
      return res.status(404).json({ error: "Drive account not found" });
    }
    const stats = await fetchDriveStats(driveAccountData);
    return res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};
export const driveStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await getUserById(req.userId!);
    const driveAccounts = await driveAccount.find({ userId: req.userId! });
    // const stats = await Promise.allSettled(driveAccounts.map((account) => fetchDriveStats(account)));
    const stats = await Promise.allSettled(
      driveAccounts.map((account) => fetchDriveStatsFromDatabase(account))
    );
    const filteredStats = stats
      .filter((stat) => stat.status === "fulfilled")
      .map((stat) => stat.value);
    return res.status(200).json(filteredStats);
  } catch (error) {
    console.log(error);
  }
};
