import { google } from "googleapis";
import { createGoogleAuthClient } from "../utils/googleAuth.js";
import User from "../models/user.js";
import DriveAccount from "../models/driveAccount.js";
import File from "../models/file.js";
import mongoose from "mongoose";
// export const fetchDriveFiles = async (user: any) => {
//   // This function will now fetch from all connected drives
//   const driveAccounts = await DriveAccount.find({ userId: user._id });

//   const allFiles = [];
//   for (const driveAccount of driveAccounts) {
//     try {
//       const files = await fetchDriveAccountFiles(driveAccount);
//       allFiles.push(...files);
//     } catch (error) {
//       console.error(
//         `Error fetching files from drive account ${driveAccount._id}:`,
//         error
//       );
//       continue; // Continue with other accounts
//     }
//   }

//   return allFiles;
// };

//used

export const fetchUserFilesService = async ({
  userId,
  page,
  limit,
  search,
  driveId,
  driveStatus,
  mimeTypes,
}: {
  userId: string;
  page: number;
  limit: number;
  search?: string;
  driveId?: string;
  driveStatus?: string;
  mimeTypes?: string[];
}) => {
  // const mimeTypes = await File.find().distinct("mimeType");
  // console.log("Distinct mimeTypes in user's files:", mimeTypes);
  const skip = (page - 1) * limit;

  const matchStage: any = {
    userId: new mongoose.Types.ObjectId(userId),
  };

  if (driveId) {
    matchStage.driveAccountId = new mongoose.Types.ObjectId(driveId);
  }

  if (search) {
    // Use a safe, case-insensitive regex search across common fields.
    // $text requires a MongoDB text index; use regex fallback so API works
    // even if the index hasn't been created.
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

       fields: 'nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, iconLink, thumbnailLink, createdTime, modifiedTime, size, parents, starred, trashed, shared, description, owners(displayName,emailAddress))',


      pageToken: nextPageToken,
    });

    if (response.data.files?.length) {
      files.push(...response.data.files);
    }

    nextPageToken = response.data.nextPageToken ?? undefined;

  } while (nextPageToken);
  console.log(files[0])
  console.log(files[1])
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

    createdTime: file.createdTime
      ? new Date(file.createdTime)
      : null,

    modifiedTime: file.modifiedTime
      ? new Date(file.modifiedTime)
      : null,

    size: file.size ? Number(file.size) : 0,

    owners: file.owners?.map((o: any) => ({
      displayName: o.displayName || "",
      emailAddress: o.emailAddress || "",
    })) || [],

    parents: file.parents || [],

    starred: Boolean(file.starred),
    trashed: Boolean(file.trashed),
    shared: Boolean(file.shared),

    description: file.description || "",
  }));
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
      console.error('Failed to load drive data from DB fallback:', dbErr);
      // continue to attempt Google call (will fail below and be handled)
    }
  }

  try {
    const auth = createGoogleAuthClient(driveAccount);
    const drive = google.drive({ version: "v3", auth });

    const { data } = await drive.about.get({ fields: "user, storageQuota" });

    const quota = data.storageQuota;
    console.log({quota})
    return {
      user: data.user,
      storage: {
        total: quota?.limit ? Number(quota.limit) : null,
        used: quota?.usage ? Number(quota.usage) : null,
        usedInDrive: quota?.usage ? Number(quota.usage) : null,
        usedInTrash: quota?.usageInDriveTrash
          ? Number(quota.usageInDriveTrash)
          : null,
        remaining:
          quota?.limit && quota?.usage
            ? Number(quota.limit) - Number(quota.usage)
            : null,
      },
    };
  } catch (error: any) {
    console.error('fetchDriveAbout error:', error?.response?.data || error);

    const errData = error?.response?.data;
    const isInvalidGrant =
      errData?.error === 'invalid_grant' ||
      (errData?.error_description && String(errData.error_description).toLowerCase().includes('revoked')) ||
      String(error?.message).toLowerCase().includes('invalid_grant') ||
      String(error?.message).toLowerCase().includes('no access');

    if (isInvalidGrant) {
      try {
        await DriveAccount.findByIdAndUpdate(driveAccount._id, {
          connectionStatus: 'revoked',
          accessToken: null,
          refreshToken: null,
        });
        console.warn(`Drive account ${driveAccount._id} marked revoked due to invalid_grant or missing tokens`);
      } catch (dbErr) {
        console.error('Failed to update DriveAccount status after invalid_grant:', dbErr);
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
        console.error('DB fallback failed after invalid_grant:', dbErr);
      }

      throw new Error('refresh_token_revoked');
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
      console.error('DB fallback failed:', dbErr);
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
    await DriveAccount.findByIdAndUpdate(
      driveAccount._id,
      {
        used: about.storage.used,
        total: about.storage.total,
        lastFetched: new Date(),
        trashedFiles,
        duplicateFiles,
        totalFiles,
        totalFolders,
      }
    );
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
      console.error('DB fallback failed in fetchDriveStats:', e);
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
      throw new Error('no_tokens_and_no_db_snapshot');
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
    await DriveAccount.findByIdAndUpdate(
      driveAccount._id,
      {
        used: about.storage.used,
        total: about.storage.total,
        lastFetched: new Date(),
        trashedFiles,
        duplicateFiles,
        totalFiles,
        totalFolders,
      }
    );

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
      console.error('DB fallback failed in updateDriveData:', e);
    }
    throw error;
  }
};

//used
export const fetchDriveStatsFromDatabase = async (driveAccount: any)=>{
  try {
    const account = await DriveAccount.findById(driveAccount._id);
    if(!account) return 
    const res = {
      _id: account._id,
      connectionStatus: account.connectionStatus,
      owner:{
        displayName: account.name,
        emailAddress: account.email,
        photoLink: account.profileImg,
        me: true
      },
      storage: {
        total: account.total,
        used: account.used,
        usedInDrive: account.used,
        usedInTrash: account.trashedFiles,
        remaining: account.total - account.used,
      },
      stats:{
        totalFiles: account.totalFiles,
        totalFolders: account.totalFolders,
        trashedFiles: account.trashedFiles,
        duplicateFiles: account.duplicateFiles,
      },
      meta:{
        fetchedAt: account.lastFetched,
        source: "google-drive-api",
      }
    }
    return res;
  } catch (error) {
    
  }
}
export interface DashboardStats {

  owner: {
    displayName: string;
    emailAddress:string;
    photoLink:string;
    me:boolean
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