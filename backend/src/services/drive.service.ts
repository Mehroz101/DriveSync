import { google } from "googleapis";
import { createGoogleAuthClient } from "../utils/googleAuth.js";
import User from "../models/user.js";
import DriveAccount from "../models/driveAccount.js";
import File from "../models/file.js";
import mongoose from "mongoose";

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

  const matchStage: any = {
    userId: new mongoose.Types.ObjectId(userId),
  };

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
  const pipeline: any[] = [
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

export const fetchDriveAccountFiles = async (driveAccount: any) => {
  try {
    const auth = createGoogleAuthClient(driveAccount);
    const drive = google.drive({ version: "v3", auth });

    console.log("🚀 Sync started →", driveAccount.email);

    let files: any[] = [];
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
    console.log(`✅ Files fetched → ${files.length}`);

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
        file.owners?.map((o: any) => ({
          displayName: o.displayName || "",
          emailAddress: o.emailAddress || "",
        })) || [],

      parents: file.parents || [],

      starred: Boolean(file.starred),
      trashed: Boolean(file.trashed),
      shared: Boolean(file.shared),

      description: file.description || "",
    }));
  } catch (error: any) {
    // Check if this is an auth error (token expired/revoked)
    const errData = error?.response?.data;
    const statusCode = error?.response?.status || error?.code;
    const errorMessage = String(error?.message || '').toLowerCase();
    const errorReason = errData?.error?.errors?.[0]?.reason || errData?.error || '';
    
    const isAuthError = 
      statusCode === 401 ||
      statusCode === 403 ||
      errData?.error === 'invalid_grant' ||
      String(errorReason).toLowerCase().includes('invalid') ||
      String(errorReason).toLowerCase().includes('revoked') ||
      errorMessage.includes('invalid_grant') ||
      errorMessage.includes('token has been expired or revoked') ||
      errorMessage.includes('invalid credentials') ||
      errorMessage.includes('unauthorized');

    if (isAuthError) {
      console.error(`❌ Auth error for account ${driveAccount.email}: ${error.message}`);
      // Update account status to revoked
      await DriveAccount.findByIdAndUpdate(driveAccount._id, {
        connectionStatus: 'revoked',
        accessToken: null,
        // Keep refreshToken in case user wants to reconnect
      });
      
      // Throw a specific error so caller knows this was an auth issue
      const authError: any = new Error(`AUTH_ERROR:${driveAccount._id}`);
      authError.isAuthError = true;
      authError.accountId = driveAccount._id;
      authError.accountEmail = driveAccount.email;
      throw authError;
    }

    // Re-throw other errors
    throw error;
  }
};

//used
export const fetchUserProfile = async (driveAccount: any) => {
  console.log("=============Fetching user profile=============");
  const auth = createGoogleAuthClient(driveAccount);
  const oauth2 = google.oauth2({ version: "v2", auth });
  const profileResponse = await oauth2.userinfo.get();
  const profile = profileResponse.data;
  console.log(driveAccount);
  // Update profile in DB
  await User.findOneAndUpdate(
    { email: driveAccount.email },
    {
      name: profile.name,
      picture: profile.picture,
    }
  );

  return profile;
};

// Search files across all connected drives
export const searchDriveFiles = async (userId: string, query: string) => {
  // Use the File model to search across all files for this user
  const File = (await import("../models/file.js")).default;

  const searchResults = await File.find({
    userId,
    $or: [
      { name: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ],
  }).limit(100); // Limit results

  return searchResults;
};

//used
export const fetchDriveQuotaFromGoogle = async (driveAccount: any) => {
  const oauth2Client = await createGoogleAuthClient(driveAccount);

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
      console.error("Failed to load drive data from DB fallback:", dbErr);
      // continue to attempt Google call (will fail below and be handled)
    }
  }

  try {
    const auth = createGoogleAuthClient(driveAccount);
    const drive = google.drive({ version: "v3", auth });

    const { data } = await drive.about.get({ fields: "user, storageQuota" });

    const quota = data.storageQuota;
    console.log({ quota });
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
  } catch (error: any) {
    console.error("fetchDriveAbout error:", error?.response?.data || error);

    const errData = error?.response?.data;
    const isInvalidGrant =
      errData?.error === "invalid_grant" ||
      (errData?.error_description &&
        String(errData.error_description).toLowerCase().includes("revoked")) ||
      String(error?.message).toLowerCase().includes("invalid_grant") ||
      String(error?.message).toLowerCase().includes("no access");

    if (isInvalidGrant) {
      try {
        await DriveAccount.findByIdAndUpdate(driveAccount._id, {
          connectionStatus: "revoked",
          accessToken: null,
          refreshToken: null,
        });
        console.warn(
          `Drive account ${driveAccount._id} marked revoked due to invalid_grant or missing tokens`
        );
      } catch (dbErr) {
        console.error(
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
        console.error("DB fallback failed after invalid_grant:", dbErr);
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
      console.error("DB fallback failed:", dbErr);
    }

    throw error;
  }
};

//used
const fetchAllFiles = async (driveAccount: any) => {
  const auth = createGoogleAuthClient(driveAccount);
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

    const duplicateMap = new Map<string, number>();

    for (const file of files) {
      if (file.trashed) trashedFiles++;

      if (file.mimeType === "application/vnd.google-apps.folder") {
        totalFolders++;
        continue;
      }

      totalFiles++;

      // Duplicate detection (safe + fast)
      if (file.name && file.size) {
        const key = `${file.name}-${file.size}`;
        duplicateMap.set(key, (duplicateMap.get(key) || 0) + 1);
      }
    }

    const duplicateFiles = Array.from(duplicateMap.values()).filter(
      (count) => count > 1
    ).length;
    await DriveAccount.findByIdAndUpdate(driveAccount._id, {
      used: about.storage.used,
      total: about.storage.total,
      lastFetched: new Date(),
      trashedFiles,
      duplicateFiles,
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
        duplicateFiles,
      },

      meta: {
        fetchedAt: new Date(),
        source: "google-drive-api",
      },
    };
  } catch (error) {
    console.log(error);
    // On unexpected errors, attempt DB fallback
    try {
      const dbRes = await fetchDriveStatsFromDatabase(driveAccount);
      if (dbRes) return { ...dbRes, _id: driveAccount._id } as any;
    } catch (e) {
      console.error("DB fallback failed in fetchDriveStats:", e);
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

    const duplicateMap = new Map<string, number>();

    for (const file of files) {
      if (file.trashed) trashedFiles++;

      if (file.mimeType === "application/vnd.google-apps.folder") {
        totalFolders++;
        continue;
      }

      totalFiles++;

      // Duplicate detection (safe + fast)
      if (file.name && file.size) {
        const key = `${file.name}-${file.size}`;
        duplicateMap.set(key, (duplicateMap.get(key) || 0) + 1);
      }
    }

    const duplicateFiles = Array.from(duplicateMap.values()).filter(
      (count) => count > 1
    ).length;
    await DriveAccount.findByIdAndUpdate(driveAccount._id, {
      used: about.storage.used,
      total: about.storage.total,
      lastFetched: new Date(),
      trashedFiles,
      duplicateFiles,
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
        duplicateFiles,
      },

      meta: {
        fetchedAt: new Date(),
        source: "google-drive-api",
      },
    };
  } catch (error) {
    console.log(error);
    // On error, try database fallback
    try {
      const dbRes = await fetchDriveStatsFromDatabase(driveAccount);
      if (dbRes) return { ...dbRes, _id: driveAccount._id } as any;
    } catch (e) {
      console.error("DB fallback failed in updateDriveData:", e);
    }
    throw error;
  }
};

//used
export const fetchDriveStatsFromDatabase = async (driveAccount: any) => {
  try {
    const account = await DriveAccount.findById(driveAccount._id);
    if (!account) return;
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
        duplicateFiles: account.duplicateFiles,
      },
      meta: {
        fetchedAt: account.lastFetched,
        source: "google-drive-api",
      },
    };
    return res;
  } catch (error) {
    console.error("Failed to fetch drive stats from database:", error);
  }
}

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
  console.log("🚀 Transactional Delete Started by User:", userId);
  console.log("Payload:", data);

  const session = await mongoose.startSession();
  let deletedCount = 0;
  const failedFiles: any[] = [];
  const revokedAccounts: { id: string; email: string }[] = [];

  try {
    await session.withTransaction(async () => {
      for (const item of data) {
        console.log(`\n--- Processing: ${item.fileId} ---`);

        // 1. Fetch file inside session
        const fileDoc: any = await File.findOne({
          userId,
          $or: [
            { _id: mongoose.isValidObjectId(item.fileId) ? item.fileId : null },
            { googleFileId: item.fileId },
          ],
        }).session(session);

        if (!fileDoc) {
          console.warn(
            `⚠️ File record for ${item.fileId} missing in DB for user ${userId}`
          );
          failedFiles.push({ fileId: item.fileId, reason: "db_not_found" });
          continue;
        }

        // 2. Drive Authentication Setup
        const driveAccountId = item.driveId || fileDoc.driveAccountId;
        const account = await DriveAccount.findById(driveAccountId).lean()
        if (!account || (!account.refreshToken && !account.accessToken)) {
          console.error(
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
            console.error('Failed to mark account revoked in DB', e);
          }
          // Still attempt DB removal to keep UI consistent
        } else {
          // 3. Drive Operation (Remove Access/Trash)
          try {
            const auth = createGoogleAuthClient(account);
            const drive = google.drive({ version: "v3", auth });

            // !!! CRITICAL FIX: Ensure 'permissions' is in the fields list !!!
            const meta = await drive.files.get({
              fileId: fileDoc.googleFileId,
              fields: "id, ownedByMe, capabilities, parents, permissions",
              supportsAllDrives: true,
            });

            console.log("permissions", meta.data);

            if (meta.data.ownedByMe) {
              // User owns the file, so they can trash it normally
              console.log("➡ Action: Trashing owned file via update");
              await drive.files.update({
                fileId: fileDoc.googleFileId,
                supportsAllDrives: true,
                requestBody: { trashed: true },
              });

              const canRemove = meta.data.capabilities?.canRemoveMyDriveParent;

              if (canRemove && meta.data.parents?.length) {
                console.log("➡ SHARED VIEWER: Removing My Drive reference");

                await drive.files.update({
                  fileId: fileDoc.googleFileId,
                  supportsAllDrives: true,
                  removeParents: meta.data.parents.join(","),
                });
              }
              console.log("✅ Drive: Owned file moved to trash.");
            } else {
              // User does not own the file. Must remove their permission explicitly.
              console.log(
                "➡ Action: Removing shared access via permissions.delete"
              );

              // Find the permission ID that matches the current authenticated user's email
              const userPermission = meta.data.permissions?.find(
                (p) => p.emailAddress === account.email
              );

              if (userPermission && userPermission.id) {
                console.log(
                  `DEBUG: Found permission ID ${userPermission.id} for user email.`
                );
                await drive.permissions.delete({
                  fileId: fileDoc.googleFileId,
                  permissionId: userPermission.id,
                  supportsAllDrives: true,
                });
                console.log(
                  "✅ Drive: Shared file access revoked successfully. File removed from user's view."
                );
              } else {
                console.warn(
                  "ℹ️ Could not find an explicit permission ID for this user's email. File might already be effectively removed from view."
                );
              }
            }

            console.log("✅ Drive operation complete for", item.fileId);
          } catch (driveErr: any) {
            const status = driveErr?.code || driveErr?.response?.status;
            const message = String(driveErr?.message || driveErr?.response?.data || "");
            console.error(
              `❌ Drive API Error [Status: ${status}]: ${message}`
            );

            // Handle specific error cases without aborting the entire transaction
            if (status === 404) {
              // File already gone — treat as success from user's perspective
              console.warn(`ℹ️ File ${item.fileId} not found on Drive (404). Proceeding to DB cleanup.`);
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
              console.error(`🔴 Auth revoked for account ${account?.email || driveAccountId}.`);

              // Persist revocation status in DB
              try {
                await DriveAccount.findByIdAndUpdate(acctId, {
                  connectionStatus: 'revoked',
                  accessToken: null,
                });
              } catch (e) {
                console.error('Failed to mark account revoked in DB', e);
              }
            } else if (status === 403 || /insufficient/i.test(message)) {
              // Insufficient permission / scopes. Mark account for reauth so they can re-grant necessary scopes.
              const acctId = (account && (account as any)._id) || driveAccountId;
              if (!revokedAccounts.find((a) => a.id === String(acctId))) {
                revokedAccounts.push({ id: String(acctId), email: (account && (account as any).email) || "" });
              }

              failedFiles.push({ fileId: item.fileId, reason: "insufficient_scopes", details: message });
              console.error(`🔒 Insufficient scopes for account ${account?.email || driveAccountId}.`);

              // Persist revocation/status change so UI can show reconnect
              try {
                await DriveAccount.findByIdAndUpdate(acctId, {
                  connectionStatus: 'revoked',
                });
              } catch (e) {
                console.error('Failed to mark account revoked in DB', e);
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
          console.log("✅ DB: Record marked trashed successfully.");
        } catch (dbErr: any) {
          console.error("❌ DB error while marking file trashed:", dbErr.message || dbErr);
          failedFiles.push({ fileId: item.fileId, reason: "db_error", details: dbErr.message || String(dbErr) });
        }
      }
    });

    console.log(`\n🎯 SUCCESS: Transaction committed. Deleted ${deletedCount} files.`);
    return { success: true, deletedCount, failedFiles, revokedAccounts };
  } catch (err: any) {
    console.error("\n🔥 TRANSACTION ABORTED:", err.message);
    // Log who requested the delete and why it failed for debugging
    console.error(
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
    console.log("🧹 Session closed");
  }
};

export const permanentlyDeleteTrashedFilesService = async (
  userId: string,
  data: FileItem[]
) => {
  console.log("🚀 Permanently Delete Trashed Files Started by User:", userId);
  console.log("Payload:", data);

  const session = await mongoose.startSession();
  let deletedCount = 0;
  const failedFiles: any[] = [];
  const revokedAccounts: { id: string; email: string }[] = [];

  try {
    await session.withTransaction(async () => {
      for (const item of data) {
        console.log(`\n--- Processing: ${item.fileId} ---`);

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
          console.warn(
            `⚠️ Trashed file record for ${item.fileId} missing in DB for user ${userId}`
          );
          failedFiles.push({ fileId: item.fileId, reason: "db_not_found_or_not_trashed" });
          continue;
        }

        // 2. Drive Authentication Setup
        const driveAccountId = item.driveId || fileDoc.driveAccountId;
        const account = await DriveAccount.findById(driveAccountId).lean();
        if (!account || (!account.refreshToken && !account.accessToken)) {
          console.error(
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
          const auth = createGoogleAuthClient(account);
          const drive = google.drive({ version: "v3", auth });

          console.log("➡ Action: Permanently deleting trashed file");
          await drive.files.delete({
            fileId: fileDoc.googleFileId,
            supportsAllDrives: true,
          });

          // 4. Remove from DB
          await File.findByIdAndDelete(fileDoc._id).session(session);
          deletedCount++;
          console.log(`✅ Permanently deleted: ${item.fileId}`);

        } catch (driveError: any) {
          console.error(`❌ Drive API error for ${item.fileId}:`, driveError.message);
          failedFiles.push({ fileId: item.fileId, reason: driveError.message });
          continue;
        }
      }
    });

    await session.endSession();

    console.log("🎉 Permanently Delete Trashed Files Completed");
    console.log(`Deleted: ${deletedCount}, Failed: ${failedFiles.length}`);

    return {
      success: true,
      deletedCount,
      failedFiles,
      revokedAccounts,
    };

  } catch (error: any) {
    await session.endSession();
    console.error("💥 Transaction failed:", error);
    return {
      success: false,
      error: error.message,
      deletedCount,
      failedFiles,
      revokedAccounts,
    };
  }
};

export interface DashboardStats {
  owner: {
    displayName: string;
    emailAddress: string;
    photoLink: string;
    me: boolean;
  };
  storage: {
    total: number;
    used: number;
    usedInDrive: number;
    usedInTrash: number;
    remaining: number;
  };
  stats: {
    totalFiles: number;
    totalFolders: number;
    trashedFiles: number;
    duplicateFiles: number;
  };
  meta: {
    fetchedAt: Date;
    source: string;
  };
}
