import { Request, Response, NextFunction } from "express";
import User from "../models/user.js";
import DriveAccount from "../models/driveAccount.js";
import File from "../models/file.js";
import { fetchDriveFiles, fetchUserProfile, fetchDriveAccountFiles } from "../services/drive.service.js";

export const getDriveFiles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.params.userId;
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
        const filesWithDriveInfo = files.map(file => ({
          ...file,
          driveAccountName: driveAccount.name,
          driveAccountEmail: driveAccount.email,
        }));
        allFiles.push(...filesWithDriveInfo);
      } catch (error) {
        console.error(`Error fetching files from drive account ${driveAccount._id}:`, error);
        continue; // Continue with other accounts
      }
    }

    res.json({ files: allFiles });
  } catch (error) {
    next(error);
  }
};

export const getMyProfile = async (req: Request, res: Response,  next: NextFunction) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const profile = await fetchUserProfile(user);
    res.json(profile);
  } catch (err: any) {
    console.error("Error fetching profile:", err);
    next(err);
  }
};

// Get all drive accounts for a user
export const getAllDriveAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId;
    const driveAccounts = await DriveAccount.find({ userId });
    
    // Don't return sensitive data like tokens
    const accountsWithoutTokens = driveAccounts.map(account => ({
      _id: account._id,
      name: account.name,
      email: account.email,
      connectionStatus: account.connectionStatus,
      scopes: account.scopes,
      lastSync: account.lastSync,
      lastFetched: account.lastFetched,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }));
    
    res.json({ accounts: accountsWithoutTokens });
  } catch (error) {
    next(error);
  }
};

// Add a new drive account (this will be handled by the auth route)
export const addDriveAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId;
    // This endpoint will redirect to the OAuth flow
    const authUrl = `/auth/add-drive-account?userId=${userId}`;
    res.json({ authUrl });
  } catch (error) {
    next(error);
  }
};

// Remove a drive account
export const removeDriveAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.params.accountId;
    
    // Remove the drive account
    const result = await DriveAccount.findByIdAndDelete(accountId);
    
    if (!result) {
      return res.status(404).json({ error: "Drive account not found" });
    }
    
    // Remove all files associated with this drive account
    await File.deleteMany({ driveAccountId: accountId });
    
    res.json({ message: "Drive account removed successfully" });
  } catch (error) {
    next(error);
  }
};

// Sync files from all connected drives
export const syncDriveFiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId;
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
        const filesToInsert = files.map(file => ({
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
        console.error(`Error syncing drive account ${driveAccount._id}:`, error);
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
      accountsSynced: driveAccounts.length 
    });
  } catch (error) {
    next(error);
  }
};
