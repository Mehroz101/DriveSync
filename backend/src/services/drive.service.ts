import { google } from "googleapis";
import { createGoogleAuthClient } from "../utils/googleAuth.js";
import User from "../models/user.js";
import DriveAccount from "../models/driveAccount.js";
import File from "../models/file.js";
import mongoose, { PipelineStage } from "mongoose";
import { handleTokenError, isAuthError } from "../utils/driveAuthUtils.js";
import { DriveTokenExpiredError } from "../utils/driveAuthError.js";
import type { DashboardStats } from "../types/index.js";
import { Types } from 'mongoose';
import { logger } from "../utils/logger.js";
import { sanitizeForLogging } from "../utils/logSanitizer.js";
interface FileItem {
  fileId: string;
  driveId: string;
}

//used
export const fetchUserFilesService = async ({
  userId,
  page,
  limit,
  search,
  driveId,
  driveStatus,
  mimeTypes,
  shared,
  starred,
  trashed,
  sizeMin,
  sizeMax,
  modifiedAfter,
}: {
  userId: string;
  page: number;
  limit: number;
  search?: string;
  driveId?: string;
  driveStatus?: string;
  mimeTypes?: string[];
  shared?: boolean;
  starred?: boolean;
  trashed?: boolean;
  sizeMin?: number;
  sizeMax?: number;
  modifiedAfter?: string;
}) => {
  const skip = (page - 1) * limit;

  const matchStage: { [key: string]: any } = {
    userId: new mongoose.Types.ObjectId(userId),
  }; // Using indexed type to allow dynamic MongoDB query properties

  if (driveId) {
    matchStage.driveAccountId = new mongoose.Types.ObjectId(driveId);
  }

  if (search) {
    // Use a safe, case-insensitive regex search across common fields.
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const q = escapeRegex(search.trim());
    const regex = new RegExp(q, "i");

    matchStage.$or = [
      { name: { $regex: regex } },
      { "owners.displayName": { $regex: regex } },
      { "owners.emailAddress": { $regex: regex } },
    ];
  }

  if (mimeTypes && mimeTypes.length > 0) {
    matchStage.mimeType = { $in: mimeTypes };
  }

  // Tag filters
  if (shared === true) {
    matchStage.shared = true;
  }
  if (starred === true) {
    matchStage.starred = true;
  }
  if (trashed === true) {
    matchStage.trashed = true;
  } else if (trashed === false || trashed === undefined) {
    // By default, exclude trashed files unless explicitly requested
    matchStage.trashed = { $ne: true };
  }

  // Size filters
  if (sizeMin !== undefined || sizeMax !== undefined) {
    matchStage.size = {};
    if (sizeMin !== undefined) {
      matchStage.size.$gte = sizeMin;
    }
    if (sizeMax !== undefined) {
      matchStage.size.$lte = sizeMax;
    }
  }

  // Date filter (modified after)
  if (modifiedAfter) {
    matchStage.modifiedTime = { $gte: new Date(modifiedAfter) };
  }
  const pipeline: PipelineStage[] = [
    { $match: matchStage },

    // Join drive account for status filtering
    {
      $lookup: {
        from: "driveaccounts",
        localField: "driveAccountId",
        foreignField: "_id",
        as: "drive",
      },
    },

    { $unwind: "$drive" },

    // Filter active drives only if requested
    ...(driveStatus === "active"
      ? [{ $match: { "drive.connectionStatus": "active" } }]
      : []),

    // Sorting
    { $sort: { modifiedTime: -1 } },

    // Pagination + Count in single query
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },

          // Response shaping
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

  return {
    files,
    pagination: {
      page,
      limit,
      totalFiles,
      totalPages: Math.ceil(totalFiles / limit),
    },
  };
};


interface DriveAccountIntf {
  _id: Types.ObjectId | string;
  email: string;
  userId: Types.ObjectId | string;
  refreshToken?: string;
  accessToken?: string;
}

export const fetchDriveAccountFiles = async (driveAccount: DriveAccountIntf) => {
  try {
    const auth = await refreshAccessToken(driveAccount);
    const drive = google.drive({ version: "v3", auth });

    logger.info("🚀 Sync started →", driveAccount.email);
    interface GoogleFile {
      id?: string | null;
      name?: string | null;
      mimeType?: string | null;
      webViewLink?: string | null;
      webContentLink?: string | null;
      iconLink?: string | null;
      thumbnailLink?: string | null;
      createdTime?: string | null;
      modifiedTime?: string | null;
      size?: string | number | null;
      parents?: string[] | null;
      starred?: boolean | null;
      trashed?: boolean | null;
      shared?: boolean | null;
      description?: string | null;
      owners?: {
        displayName?: string | null;
        emailAddress?: string | null;
      }[] | null;
    }
    
    let files: GoogleFile[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
      const response: any = await drive.files.list({
        pageSize: 1000,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields:
          "nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, iconLink, thumbnailLink, createdTime, modifiedTime, size, parents, starred, trashed, shared, description, owners(displayName,emailAddress))",

        pageToken: nextPageToken,
      });

      if (response.data.files?.length) {
        files.push(...response.data.files);
      }

      nextPageToken = response.data.nextPageToken ?? undefined;
    } while (nextPageToken);
    logger.info(`✅ Files fetched → ${files.length}`);

    // Normalize EXACTLY to your File schema
    return files.map((file) => ({
      userId: driveAccount.userId,
      driveAccountId: driveAccount._id,

      googleFileId: file.id,

      name: file.name || "",
      mimeType: file.mimeType || "",

      webViewLink: file.webViewLink || null,
      webContentLink: file.webContentLink || null,
      iconLink: file.iconLink || null,
      thumbnailUrl: file.thumbnailLink || null,

      createdTime: file.createdTime ? new Date(file.createdTime) : null,

      modifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : null,

      size: file.size ? Number(file.size) : 0,

      owners:
        file.owners?.map((o) => ({
          displayName: o.displayName || "",
          emailAddress: o.emailAddress || "",
        })) || [],

      parents: file.parents || [],

      starred: Boolean(file.starred),
      trashed: Boolean(file.trashed),
      shared: Boolean(file.shared),

      description: file.description || "",
    }));
  } catch (error) {
    logger.error(`❌ Error fetching files for account ${driveAccount.email}:`, (error as Error).message);
    
    // Use centralized auth error handling
    if (isAuthError(error as Error)) {
      logger.error(`❌ Auth error for account ${driveAccount.email}: ${(error as Error).message}`);
      
      // Mark account as revoked
      await DriveAccount.findByIdAndUpdate(driveAccount._id, {
        connectionStatus: 'revoked',
        accessToken: null,
      });
      
      // Throw specific auth error
      throw new DriveTokenExpiredError(driveAccount._id.toString(), driveAccount.email);
    }

    // Re-throw other errors
    throw error;
  }
};

//used
export const fetchUserProfile = async (driveAccount: any) => {
    logger.info('Fetching user profile', { email: driveAccount.email });
  
  try {
    const auth = await refreshAccessToken(driveAccount);
    const oauth2 = google.oauth2({ version: "v2", auth });
    const profileResponse = await oauth2.userinfo.get();
    const profile = profileResponse.data;
    
    logger.info('Drive account details', { email: driveAccount.email, id: driveAccount._id });
    // Update profile in DB
    await User.findOneAndUpdate(
      { email: driveAccount.email },
      {
        name: profile.name,
        picture: profile.picture,
      }
    );

    return profile;
  } catch (error) {
    // Centralized auth error handling will be done by refreshAccessToken
    // Just re-throw the error
    throw error;
  }
};

// Search files across all connected drives
export const searchDriveFiles = async (userId: string, query: string) => {
  // Use the File model to search across all files for this user
  const File = (await import("../models/file.js")).default;

  // Escape special regex characters to prevent regex injection
  const sanitizedQuery = query
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const searchResults = await File.find({
    userId,
    $or: [
      { name: { $regex: sanitizedQuery, $options: "i" } },
      { description: { $regex: sanitizedQuery, $options: "i" } },
    ],
  }).limit(100); // Limit results

  return searchResults;
};

//used
export const fetchDriveQuotaFromGoogle = async (driveAccount: any) => {
  try {
    const oauth2Client = await refreshAccessToken(driveAccount);

    const drive = google.drive({
      version: "v3",
      auth: oauth2Client,
    });

    const response = await drive.about.get({
      fields: "storageQuota",
    });
    const quota = response.data.storageQuota;

    return {
      used: Number(quota?.usage || 0),
      total: Number(quota?.limit || 0),
      usageInDrive: Number(quota?.usageInDrive || 0),
      usageInDriveTrash: Number(quota?.usageInDriveTrash || 0),
    };
  } catch (error) {
    // Auth errors are handled by refreshAccessToken and will be re-thrown
    // Just log and re-throw for caller to handle
    logger.error(`Error fetching quota for ${driveAccount.email}:`, (error as Error).message);
    throw error;
  }
};
const fetchDriveAbout = async (driveAccount: any) => {
  // If there are no tokens available, return stored DB snapshot so UI can show last-known data
  if (!driveAccount?.accessToken && !driveAccount?.refreshToken) {
    try {
      const dbRes = await fetchDriveStatsFromDatabase(driveAccount);
      if (dbRes) {
        return {
          user: dbRes.owner,
          storage: dbRes.storage,
        };
      }
    } catch (dbErr) {
      logger.error("Failed to load drive data from DB fallback:", dbErr);
      // continue to attempt Google call (will fail below and be handled)
    }
  }

  try {
    const auth = await refreshAccessToken(driveAccount);
    const drive = google.drive({ version: "v3", auth });

    const { data } = await drive.about.get({ fields: "user, storageQuota" });

    const quota = data.storageQuota;
    logger.info({ quota });
    return {
      user: data.user,
      storage: {
        total: quota?.limit ? Number(quota.limit) : null,
        used: quota?.usage ? Number(quota.usage) : null,
        usedInDrive: quota?.usage ? Number(quota.usage) : null,
        usedInTrash: quota?.usageInDriveTrash
          ? Number(quota?.usageInDriveTrash)
          : null,
        remaining:
          quota?.limit && quota?.usage
            ? Number(quota.limit) - Number(quota.usage)
            : null,
      },
    };
  } catch (error) {
    const errorObj = error as any;
    logger.error("fetchDriveAbout error:", errorObj?.response?.data || error);

    const errData = errorObj?.response?.data;
    const isInvalidGrant =
      errData?.error === "invalid_grant" ||
      (errData?.error_description &&
        String(errData.error_description).toLowerCase().includes("revoked")) ||
      String(errorObj?.message).toLowerCase().includes("invalid_grant") ||
      String(errorObj?.message).toLowerCase().includes("no access");

    if (isInvalidGrant) {
      try {
        await DriveAccount.findByIdAndUpdate(driveAccount._id, {
          connectionStatus: "revoked",
          accessToken: null,
          refreshToken: null,
        });
        logger.warn(
          `Drive account ${driveAccount._id} marked revoked due to invalid_grant or missing tokens`
        );
      } catch (dbErr) {
        logger.error(
          "Failed to update DriveAccount status after invalid_grant:",
          dbErr
        );
      }

      // Try DB fallback before throwing
      try {
        const dbRes = await fetchDriveStatsFromDatabase(driveAccount);
        if (dbRes) {
          return {
            user: dbRes.owner,
            storage: dbRes.storage,
          };
        }
      } catch (dbErr) {
        logger.error("DB fallback failed after invalid_grant:", dbErr);
      }

      throw new Error("refresh_token_revoked");
    }

    // For other errors, attempt DB fallback
    try {
      const dbRes = await fetchDriveStatsFromDatabase(driveAccount);
      if (dbRes) {
        return {
          user: dbRes.owner,
          storage: dbRes.storage,
        };
      }
    } catch (dbErr) {
      logger.error("DB fallback failed:", dbErr);
    }

    throw error;
  }
};

//used
const fetchAllFiles = async (driveAccount: any) => {
  const auth = await refreshAccessToken(driveAccount);
  const drive = google.drive({ version: "v3", auth });

  let files: any[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      pageSize: 1000,
      pageToken,
      fields: "nextPageToken, files(id, name, mimeType, size, trashed)",
      // fields: `nextPageToken, files(id, name, mimeType, description, starred, trashed, parents, createdTime, modifiedTime, iconLink, webViewLink, webContentLink, owners(displayName,emailAddress), size, shared, capabilities(canEdit))`,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    files.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);

  return files;
};

// ============================================================
// DUPLICATE CALCULATION LOGIC
// ============================================================
//
// Definitions:
//   "Duplicate Group" = 2+ non-trashed, non-folder files sharing the same (name, size)
//                       across ALL of the user's drives.
//
//   Global stats
//     duplicateGroups  – number of distinct duplicate groups
//     duplicateFiles   – total individual files that belong to any group
//                        (e.g. 3 copies of "a.pdf" = 3 duplicate files)
//     wastedFiles      – files that could be removed, keeping one per group
//                        = duplicateFiles – duplicateGroups
//     wastedSpace      – bytes recoverable = Σ (count-1)*size per group
//
//   Per-drive stats
//     duplicateFiles   – files in THIS drive that belong to a global dup group
//     wastedFiles      – extra copies in THIS drive (within-drive duplicates only)
//                        = Σ max(0, countInThisDrive - 1) per group
//     wastedSpace      – bytes recoverable from this drive
//                        = Σ max(0, countInThisDrive - 1) * size per group
// ============================================================

interface GlobalDuplicate {
  _id: { name: string; size: number };
  count: number;
  size: number;
  driveIds: mongoose.Types.ObjectId[];
  filesByDrive: { driveId: mongoose.Types.ObjectId; count: number }[];
}

interface DuplicateStats {
  duplicateGroups: number;
  duplicateFiles: number;
  wastedFiles: number;
  wastedSpace: number;
}

// Helper function to calculate duplicates across ALL user files (global)
const calculateGlobalDuplicates = async (userId: string | mongoose.Types.ObjectId): Promise<GlobalDuplicate[]> => {
  try {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          trashed: false,
          mimeType: { $ne: "application/vnd.google-apps.folder" },
        },
      },
      {
        $group: {
          _id: { name: "$name", size: "$size" },
          count: { $sum: 1 },
          size: { $first: "$size" },
          driveIds: { $addToSet: "$driveAccountId" },
          filesByDrive: {
            $push: { driveId: "$driveAccountId" },
          },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ];

    const rawGroups = await File.aggregate(pipeline);

    // Post-process to count files per drive within each group
    return rawGroups.map((group) => {
      const driveCounts = new Map<string, number>();
      for (const entry of group.filesByDrive) {
        const key = entry.driveId.toString();
        driveCounts.set(key, (driveCounts.get(key) || 0) + 1);
      }
      return {
        ...group,
        filesByDrive: Array.from(driveCounts.entries()).map(([driveId, count]) => ({
          driveId: new mongoose.Types.ObjectId(driveId),
          count,
        })),
      };
    });
  } catch (error) {
    logger.error("Error calculating global duplicates:", error);
    return [];
  }
};

// Summarise global duplicate stats from pre-calculated groups
const summariseGlobalDuplicates = (globalDuplicates: GlobalDuplicate[]): DuplicateStats => {
  let duplicateFiles = 0;
  let wastedSpace = 0;

  for (const group of globalDuplicates) {
    duplicateFiles += group.count;
    wastedSpace += (group.count - 1) * (group.size || 0);
  }

  return {
    duplicateGroups: globalDuplicates.length,
    duplicateFiles,
    wastedFiles: duplicateFiles - globalDuplicates.length,
    wastedSpace,
  };
};

// Calculate duplicate stats scoped to a single drive
const calculateDuplicatesForDrive = (
  driveAccountId: string | mongoose.Types.ObjectId,
  globalDuplicates: GlobalDuplicate[]
): DuplicateStats => {
  const driveIdStr = driveAccountId.toString();
  let duplicateFiles = 0;
  let wastedFiles = 0;
  let wastedSpace = 0;
  let duplicateGroups = 0;

  for (const group of globalDuplicates) {
    const driveEntry = group.filesByDrive.find(
      (e) => e.driveId.toString() === driveIdStr
    );
    if (!driveEntry) continue;

    // This drive participates in this duplicate group
    duplicateGroups++;
    duplicateFiles += driveEntry.count;

    // Within-drive wasted copies (if this drive has 3 copies, 2 are wasted)
    const wastedInDrive = Math.max(0, driveEntry.count - 1);
    wastedFiles += wastedInDrive;
    wastedSpace += wastedInDrive * (group.size || 0);
  }

  return { duplicateGroups, duplicateFiles, wastedFiles, wastedSpace };
};

//used
export const fetchDriveStats = async (driveAccount: any) => {
  try {
    // If account has no tokens, return DB snapshot immediately
    if (!driveAccount?.accessToken && !driveAccount?.refreshToken) {
      const dbRes = await fetchDriveStatsFromDatabase(driveAccount);
      if (dbRes) return { ...dbRes, _id: driveAccount._id } as any;
    }

    const [about, files] = await Promise.all([
      fetchDriveAbout(driveAccount),
      fetchAllFiles(driveAccount),
    ]);

    let totalFiles = 0;
    let totalFolders = 0;
    let trashedFiles = 0;

    for (const file of files) {
      if (file.trashed) trashedFiles++;

      if (file.mimeType === "application/vnd.google-apps.folder") {
        totalFolders++;
        continue;
      }

      totalFiles++;
    }

    // Calculate duplicates from database Files collection for this drive
    const globalDuplicates = await calculateGlobalDuplicates(driveAccount.userId);
    const duplicateStats = calculateDuplicatesForDrive(driveAccount._id, globalDuplicates);

    await DriveAccount.findByIdAndUpdate(driveAccount._id, {
      used: about.storage.used,
      total: about.storage.total,
      lastFetched: new Date(),
      trashedFiles,
      duplicateFiles: duplicateStats.duplicateFiles,
      totalFiles,
      totalFolders,
    });
    return {
      _id: driveAccount._id,
      connectionStatus: driveAccount.connectionStatus,
      owner: about.user,
      storage: about.storage,

      stats: {
        totalFiles,
        totalFolders,
        trashedFiles,
        duplicateFiles: duplicateStats.duplicateFiles,
        duplicateSize: duplicateStats.wastedSpace,
      },

      meta: {
        fetchedAt: new Date(),
        source: "google-drive-api",
      },
    };
  } catch (error) {
    logger.info(error);
    // On unexpected errors, attempt DB fallback
    try {
      const dbRes = await fetchDriveStatsFromDatabase(driveAccount);
      if (dbRes) return { ...dbRes, _id: driveAccount._id } as any;
    } catch (e) {
      logger.error("DB fallback failed in fetchDriveStats:", e);
    }
    throw error;
  }
};

//used
export const updateDriveData = async (driveAccount: any) => {
  try {
    // If account has no tokens, return DB snapshot instead of updating from Google
    if (!driveAccount?.accessToken && !driveAccount?.refreshToken) {
      const dbRes = await fetchDriveStatsFromDatabase(driveAccount);
      if (dbRes) return { ...dbRes, _id: driveAccount._id } as any;
      // If no DB data either, throw a clear error so caller can handle
      throw new Error("no_tokens_and_no_db_snapshot");
    }

    const [about, files] = await Promise.all([
      fetchDriveAbout(driveAccount),
      fetchAllFiles(driveAccount),
    ]);

    let totalFiles = 0;
    let totalFolders = 0;
    let trashedFiles = 0;

    for (const file of files) {
      if (file.trashed) trashedFiles++;

      if (file.mimeType === "application/vnd.google-apps.folder") {
        totalFolders++;
        continue;
      }

      totalFiles++;
    }

    // Calculate duplicates from database Files collection for this drive
    const globalDuplicates2 = await calculateGlobalDuplicates(driveAccount.userId);
    const duplicateStats = calculateDuplicatesForDrive(driveAccount._id, globalDuplicates2);

    await DriveAccount.findByIdAndUpdate(driveAccount._id, {
      used: about.storage.used,
      total: about.storage.total,
      lastFetched: new Date(),
      trashedFiles,
      duplicateFiles: duplicateStats.duplicateFiles,
      totalFiles,
      totalFolders,
    });

    return {
      _id: driveAccount._id,
      connectionStatus: driveAccount.connectionStatus,
      owner: about.user,
      storage: about.storage,

      stats: {
        totalFiles,
        totalFolders,
        trashedFiles,
        duplicateFiles: duplicateStats.duplicateFiles,
        duplicateSize: duplicateStats.wastedSpace,
      },

      meta: {
        fetchedAt: new Date(),
        source: "google-drive-api",
      },
    };
  } catch (error) {
    logger.info(error);
    // On error, try database fallback
    try {
      const dbRes = await fetchDriveStatsFromDatabase(driveAccount);
      if (dbRes) return { ...dbRes, _id: driveAccount._id } as any;
    } catch (e) {
      logger.error("DB fallback failed in updateDriveData:", e);
    }
    throw error;
  }
};

//used
export const fetchDriveStatsFromDatabase = async (driveAccount: any) => {
  try {
    const account = await DriveAccount.findById(driveAccount._id);
    if (!account) return;
    
    // Calculate duplicates from Files collection
    const globalDuplicates = await calculateGlobalDuplicates(account.userId);
    const duplicateStats = calculateDuplicatesForDrive(account._id, globalDuplicates);
    
    const res = {
      _id: account._id,
      connectionStatus: account.connectionStatus,
      owner: {
        displayName: account.name,
        emailAddress: account.email,
        photoLink: account.profileImg,
        me: true,
      },
      storage: {
        total: account.total,
        used: account.used,
        usedInDrive: account.used,
        usedInTrash: account.trashedFiles,
        remaining: account.total - account.used,
      },
      stats: {
        totalFiles: account.totalFiles,
        totalFolders: account.totalFolders,
        trashedFiles: account.trashedFiles,
        duplicateFiles: duplicateStats.duplicateFiles,
        duplicateSize: duplicateStats.wastedSpace,
      },
      meta: {
        fetchedAt: account.lastFetched,
        source: "google-drive-api",
      },
    };
    return res;
  } catch (error) {
    logger.error("Failed to fetch drive stats from database:", error);
  }
}

// Optimized function to fetch stats for multiple drives at once
// Calculates global duplicates once and reuses for all drives
export const fetchMultipleDriveStatsFromDatabase = async (driveAccounts: any[]) => {
  try {
    if (!driveAccounts || driveAccounts.length === 0) {
      return { drives: [], globalDuplicates: { duplicateGroups: 0, duplicateFiles: 0, wastedFiles: 0, wastedSpace: 0 } };
    }

    // Get userId from first account (all should have same userId)
    const userId = driveAccounts[0].userId;
    
    // Calculate global duplicates once for all drives
    logger.info('🔍 Calculating global duplicates for user:', userId);
    const globalDuplicates = await calculateGlobalDuplicates(userId);
    const globalStats = summariseGlobalDuplicates(globalDuplicates);
    logger.info(`✅ Found ${globalDuplicates.length} duplicate groups, ${globalStats.duplicateFiles} duplicate files, ${globalStats.wastedSpace} bytes wasted`);

    // Process each drive with the shared global duplicates
    const results = await Promise.all(
      driveAccounts.map(async (driveAccount) => {
        try {
          const account = await DriveAccount.findById(driveAccount._id);
          if (!account) return null;
          
          // Calculate duplicates for this specific drive using global duplicates
          const duplicateStats = calculateDuplicatesForDrive(
            account._id, 
            globalDuplicates
          );
          
          return {
            _id: account._id,
            connectionStatus: account.connectionStatus,
            owner: {
              displayName: account.name,
              emailAddress: account.email,
              photoLink: account.profileImg,
              me: true,
            },
            storage: {
              total: account.total,
              used: account.used,
              usedInDrive: account.used,
              usedInTrash: account.trashedFiles,
              remaining: account.total - account.used,
            },
            stats: {
              totalFiles: account.totalFiles,
              totalFolders: account.totalFolders,
              trashedFiles: account.trashedFiles,
              duplicateFiles: duplicateStats.duplicateFiles,
              duplicateSize: duplicateStats.wastedSpace,
            },
            meta: {
              fetchedAt: account.lastFetched,
              source: "database",
            },
          };
        } catch (error) {
          logger.error(`Failed to fetch stats for drive ${driveAccount._id}:`, error);
          return null;
        }
      })
    );

    return {
      drives: results.filter((result) => result !== null),
      globalDuplicates: globalStats,
    };
  } catch (error) {
    logger.error("Failed to fetch multiple drive stats from database:", error);
    return { drives: [], globalDuplicates: { duplicateGroups: 0, duplicateFiles: 0, wastedFiles: 0, wastedSpace: 0 } };
  }
};

// Define interfaces for better TypeScript support (assuming these models exist)
interface DriveAccountDoc {
  refreshToken?: string;
  accessToken?: string;
  email: string; // Ensure your DriveAccount model has an 'email' field
}

// Assuming createGoogleAuthClient, File, and DriveAccount are defined elsewhere in scope

export const deleteFilesService = async (
  userId: string, // The ID of the user requesting the delete
  data: FileItem[]
) => {
  logger.info("🚀 Transactional Delete Started by User:", userId);
  logger.info("Payload:", data);

  const session = await mongoose.startSession();
  let deletedCount = 0;
  const failedFiles: any[] = [];
  const revokedAccounts: { id: string; email: string }[] = [];

  try {
    await session.withTransaction(async () => {
      for (const item of data) {
        logger.info(`\n--- Processing: ${item.fileId} ---`);

        // 1. Fetch file inside session
        const fileDoc: any = await File.findOne({
          userId,
          $or: [
            { _id: mongoose.isValidObjectId(item.fileId) ? item.fileId : null },
            { googleFileId: item.fileId },
          ],
        }).session(session);

        if (!fileDoc) {
          logger.warn(
            `⚠️ File record for ${item.fileId} missing in DB for user ${userId}`
          );
          failedFiles.push({ fileId: item.fileId, reason: "db_not_found" });
          continue;
        }

        // 2. Drive Authentication Setup
        const driveAccountId = item.driveId || fileDoc.driveAccountId;
        const account = await DriveAccount.findById(driveAccountId).lean()
        if (!account || (!account.refreshToken && !account.accessToken)) {
          logger.error(
            "❌ Missing Auth Credentials for account:",
            driveAccountId
          );
          // Mark account as needing reauth and record failure, but continue
          const acctId = (account && account._id) || driveAccountId;
          if (!revokedAccounts.find((a) => a.id === String(acctId))) {
            revokedAccounts.push({ id: String(acctId), email: account?.email || "" });
          }
          failedFiles.push({ fileId: item.fileId, reason: "auth_missing" });
          // Persist revocation status so the UI can show reconnect CTA
          try {
            await DriveAccount.findByIdAndUpdate(acctId, {
              connectionStatus: 'revoked',
              accessToken: null,
            });
          } catch (e) {
            logger.error('Failed to mark account revoked in DB', e);
          }
          // Still attempt DB removal to keep UI consistent
        } else {
          // 3. Drive Operation (Remove Access/Trash)
          try {
            const auth = await refreshAccessToken(account);
            const drive = google.drive({ version: "v3", auth });

            // !!! CRITICAL FIX: Ensure 'permissions' is in the fields list !!!
            const meta = await drive.files.get({
              fileId: fileDoc.googleFileId,
              fields: "id, ownedByMe, capabilities, parents, permissions",
              supportsAllDrives: true,
            });

            logger.info("permissions", meta.data);

            if (meta.data.ownedByMe) {
              // User owns the file, so they can trash it normally
              logger.info("➡ Action: Trashing owned file via update");
              await drive.files.update({
                fileId: fileDoc.googleFileId,
                supportsAllDrives: true,
                requestBody: { trashed: true },
              });

              const canRemove = meta.data.capabilities?.canRemoveMyDriveParent;

              if (canRemove && meta.data.parents?.length) {
                logger.info("➡ SHARED VIEWER: Removing My Drive reference");

                await drive.files.update({
                  fileId: fileDoc.googleFileId,
                  supportsAllDrives: true,
                  removeParents: meta.data.parents.join(","),
                });
              }
              logger.info("✅ Drive: Owned file moved to trash.");
            } else {
              // User does not own the file. Must remove their permission explicitly.
              logger.info(
                "➡ Action: Removing shared access via permissions.delete"
              );

              // Find the permission ID that matches the current authenticated user's email
              const userPermission = meta.data.permissions?.find(
                (p) => p.emailAddress === account.email
              );

              if (userPermission && userPermission.id) {
                logger.info(
                  `DEBUG: Found permission ID ${userPermission.id} for user email.`
                );
                await drive.permissions.delete({
                  fileId: fileDoc.googleFileId,
                  permissionId: userPermission.id,
                  supportsAllDrives: true,
                });
                logger.info(
                  "✅ Drive: Shared file access revoked successfully. File removed from user's view."
                );
              } else {
                logger.warn(
                  "ℹ️ Could not find an explicit permission ID for this user's email. File might already be effectively removed from view."
                );
              }
            }

            logger.info("✅ Drive operation complete for", item.fileId);
          } catch (driveErr: any) {
            const status = driveErr?.code || driveErr?.response?.status;
            const message = String(driveErr?.message || driveErr?.response?.data || "");
            logger.error(
              `❌ Drive API Error [Status: ${status}]: ${message}`
            );

            // Check if this is a DriveTokenExpiredError from our centralized error handling
            if (driveErr instanceof DriveTokenExpiredError) {
              if (!revokedAccounts.find((a) => a.id === driveErr.accountId)) {
                revokedAccounts.push({ id: driveErr.accountId, email: driveErr.accountEmail });
              }
              failedFiles.push({ fileId: item.fileId, reason: "auth_revoked", details: message });
              logger.error(`🔴 Auth revoked for account ${driveErr.accountEmail}.`);
            } 
            // Handle specific error cases without aborting the entire transaction
            else if (status === 404) {
              // File already gone — treat as success from user's perspective
              logger.warn(`ℹ️ File ${item.fileId} not found on Drive (404). Proceeding to DB cleanup.`);
            } else if (
              status === 401 ||
              message.includes("invalid_grant") ||
              /token revoked/i.test(message)
            ) {
              // Authentication has been revoked — mark account for reauth
              const acctId = (account && (account as any)._id) || driveAccountId;
              if (!revokedAccounts.find((a) => a.id === String(acctId))) {
                revokedAccounts.push({ id: String(acctId), email: (account && (account as any).email) || "" });
              }

              failedFiles.push({ fileId: item.fileId, reason: "auth_revoked", details: message });
              logger.error(`🔴 Auth revoked for account ${account?.email || driveAccountId}.`);

              // Persist revocation status in DB
              try {
                await DriveAccount.findByIdAndUpdate(acctId, {
                  connectionStatus: 'revoked',
                  accessToken: null,
                });
              } catch (e) {
                logger.error('Failed to mark account revoked in DB', e);
              }
            } else if (status === 403 || /insufficient/i.test(message)) {
              // ...existing code...
              const acctId = (account && (account as any)._id) || driveAccountId;
              if (!revokedAccounts.find((a) => a.id === String(acctId))) {
                revokedAccounts.push({ id: String(acctId), email: (account && (account as any).email) || "" });
              }

              failedFiles.push({ fileId: item.fileId, reason: "insufficient_scopes", details: message });
              logger.error(`🔒 Insufficient scopes for account ${account?.email || driveAccountId}.`);

              // Persist revocation/status change so UI can show reconnect
              try {
                await DriveAccount.findByIdAndUpdate(acctId, {
                  connectionStatus: 'revoked',
                });
              } catch (e) {
                logger.error('Failed to mark account revoked in DB', e);
              }
            } else {
              // Unknown drive error — record and continue
              failedFiles.push({ fileId: item.fileId, reason: "drive_error", details: message });
            }
          }
        }

        // // 4. Database Delete / Mark trashed
        try {
          await File.findByIdAndUpdate(
            fileDoc._id,
            {
              trashed: true,
            },
            { session }
          );

          deletedCount++;
          logger.info("✅ DB: Record marked trashed successfully.");
        } catch (dbErr: any) {
          logger.error("❌ DB error while marking file trashed:", dbErr.message || dbErr);
          failedFiles.push({ fileId: item.fileId, reason: "db_error", details: dbErr.message || String(dbErr) });
        }
      }
    });

    logger.info(`\n🎯 SUCCESS: Transaction committed. Deleted ${deletedCount} files.`);
    return { success: true, deletedCount, failedFiles, revokedAccounts };
  } catch (err: any) {
    logger.error("\n🔥 TRANSACTION ABORTED:", err.message);
    // Log who requested the delete and why it failed for debugging
    logger.error(
      `Failure context: User ${userId} failed to delete file ${data
        .map((i) => i.fileId)
        .join(", ")}.`
    );

    return {
      success: false,
      error: err.message,
      deletedCount: 0,
      failedFiles,
      revokedAccounts,
    };
  } finally {
    await session.endSession();
    logger.info("🧹 Session closed");
  }
};

export const permanentlyDeleteTrashedFilesService = async (
  userId: string,
  data: FileItem[]
) => {
  logger.info("🚀 Permanently Delete Trashed Files Started by User:", userId);
  logger.info("Payload:", data);

  const session = await mongoose.startSession();
  let deletedCount = 0;
  const failedFiles: any[] = [];
  const revokedAccounts: { id: string; email: string }[] = [];

  try {
    await session.withTransaction(async () => {
      for (const item of data) {
        logger.info(`\n--- Processing: ${item.fileId} ---`);

        // 1. Fetch file inside session, ensure it's trashed
        const fileDoc: any = await File.findOne({
          userId,
          trashed: true,
          $or: [
            { _id: mongoose.isValidObjectId(item.fileId) ? item.fileId : null },
            { googleFileId: item.fileId },
          ],
        }).session(session);

        if (!fileDoc) {
          logger.warn(
            `⚠️ Trashed file record for ${item.fileId} missing in DB for user ${userId}`
          );
          failedFiles.push({ fileId: item.fileId, reason: "db_not_found_or_not_trashed" });
          continue;
        }

        // 2. Drive Authentication Setup
        const driveAccountId = item.driveId || fileDoc.driveAccountId;
        const account = await DriveAccount.findById(driveAccountId).lean();
        if (!account || (!account.refreshToken && !account.accessToken)) {
          logger.error(
            "❌ Missing Auth Credentials for account:",
            driveAccountId
          );
          const acctId = (account && account._id) || driveAccountId;
          if (!revokedAccounts.find((a) => a.id === String(acctId))) {
            revokedAccounts.push({ id: String(acctId), email: account?.email || "" });
          }
          failedFiles.push({ fileId: item.fileId, reason: "auth_missing" });
          continue; // Don't remove from DB if can't delete from Drive
        }

        // 3. Permanently delete from Google Drive
        try {
          const auth = await refreshAccessToken(account);
          const drive = google.drive({ version: "v3", auth });

          logger.info("➡ Action: Permanently deleting trashed file");
          await drive.files.delete({
            fileId: fileDoc.googleFileId,
            supportsAllDrives: true,
          });

          // 4. Remove from DB
          await File.findByIdAndDelete(fileDoc._id).session(session);
          deletedCount++;
          logger.info(`✅ Permanently deleted: ${item.fileId}`);

        } catch (driveError: any) {
          logger.error(`❌ Drive API error for ${item.fileId}:`, driveError.message);
          failedFiles.push({ fileId: item.fileId, reason: driveError.message });
          continue;
        }
      }
    });

    await session.endSession();

    logger.info("🎉 Permanently Delete Trashed Files Completed");
    logger.info(`Deleted: ${deletedCount}, Failed: ${failedFiles.length}`);

    return {
      success: true,
      deletedCount,
      failedFiles,
      revokedAccounts,
    };

  } catch (error) {
    await session.endSession();
    logger.error("💥 Transaction failed:", error);
    return {
      success: false,
      error: (error as Error).message,
      deletedCount,
      failedFiles,
      revokedAccounts,
    };
  }
};



// Refresh access token for a drive account and return authenticated client
export const refreshAccessToken = async (driveAccount: any) => {
  const auth = createGoogleAuthClient(driveAccount);
  
  try {
    const { credentials } = await auth.refreshAccessToken();
    auth.setCredentials(credentials);
    
    // Update the stored access token if it changed
    if (credentials.access_token && credentials.access_token !== driveAccount.accessToken) {
      await DriveAccount.findByIdAndUpdate(driveAccount._id, {
        accessToken: credentials.access_token,
      });
    }
    
    return auth;
  } catch (tokenError: any) {
    logger.error('Token refresh failed:', tokenError);
    
    // Use centralized error handling - this will throw the appropriate error
    await handleTokenError(tokenError, driveAccount._id, driveAccount.email);
    
    // This line should never be reached as handleTokenError will throw
    throw new Error("Authentication failed");
  }
};
