import { google } from "googleapis";
import { createGoogleAuthClient } from "../utils/googleAuth.js";
import User from "../models/user.js";
import DriveAccount from "../models/driveAccount.js";

export const fetchDriveFiles = async (user: any) => {
  // This function will now fetch from all connected drives
  const driveAccounts = await DriveAccount.find({ userId: user._id });

  const allFiles = [];
  for (const driveAccount of driveAccounts) {
    try {
      const files = await fetchDriveAccountFiles(driveAccount);
      allFiles.push(...files);
    } catch (error) {
      console.error(
        `Error fetching files from drive account ${driveAccount._id}:`,
        error
      );
      continue; // Continue with other accounts
    }
  }

  return allFiles;
};

export const fetchDriveAccountFiles = async (driveAccount: any) => {
  const auth = driveAccount;
  const drive = google.drive({ version: "v3", auth });

  let files: any[] = [];
  let nextPageToken: string | undefined = undefined;

  do {
    const response: any = await drive.files.list({
      pageSize: 100,
      fields: `nextPageToken, files(id, name, mimeType, description, starred, trashed, parents, createdTime, modifiedTime, iconLink, webViewLink, webContentLink, owners(displayName,emailAddress), size, shared, capabilities(canEdit))`,
      pageToken: nextPageToken,
    });

    files = files.concat(response.data.files || []);
    nextPageToken = response.data.nextPageToken ?? undefined;
  } while (nextPageToken);

  // Process files to normalize the structure
  return files.map((file) => ({
    id: file.id,
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
};

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
      String(error?.message).toLowerCase().includes('invalid_grant');

    if (isInvalidGrant) {
      try {
        await DriveAccount.findByIdAndUpdate(driveAccount._id, {
          connectionStatus: 'revoked',
          accessToken: null,
          refreshToken: null,
        });
        console.warn(`Drive account ${driveAccount._id} marked revoked due to invalid_grant`);
      } catch (dbErr) {
        console.error('Failed to update DriveAccount status after invalid_grant:', dbErr);
      }
      // Rethrow a clear error for upstream handling
      throw new Error('refresh_token_revoked');
    }

    throw error;
  }
};

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

export const fetchDriveStats = async (driveAccount: any) => {
  try {
    
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
    const res = await DriveAccount.findByIdAndUpdate(
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
    console.log(error)
  }
};
export const updateDriveData = async (driveAccount: any) => {
  try {
    
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
    const res = await DriveAccount.findByIdAndUpdate(
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
    console.log(error)
  }
};


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