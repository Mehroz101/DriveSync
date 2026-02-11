import mongoose, { ObjectId } from 'mongoose';

// Authentication related types
import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: any;
  error?: string;
}

export interface OAuthState {
  userId: string;
  csrfToken: string;
  timestamp: number;
  nonce: string;
  meta?: Record<string, string>;
}

// Request and middleware types
export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

// File and drive related types
export interface Owner {
  displayName?: string | null;
  emailAddress?: string | null;
}

export interface DriveFile {
  userId: ObjectId | string;
  driveAccountId: mongoose.Types.ObjectId | string;
  googleFileId: string | null;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  webContentLink: string | null;
  iconLink: string | null;
  thumbnailUrl: string | null;
  createdTime: Date | null;
  modifiedTime: Date | null;
  size: number;
  owners: Owner[];
  parents: string[];
  starred: boolean;
  trashed: boolean;
  shared: boolean;
  isDuplicate: boolean;
  description: string;
}

export interface BulkWriteOperation {
  updateOne: {
    filter: {
      googleFileId: string | null | undefined;
      driveAccountId: mongoose.Types.ObjectId;
    };
    update: {
      $set: DriveFile;
    };
    upsert: boolean;
  };
}

// Dashboard related types
export interface DashboardStats {
  summary: {
    totalDrives: number;
    totalFiles: number;
    totalStorageUsed: number;
    totalStorageLimit: number;
    storagePercentage: number;
    duplicateFiles: number;
    duplicateSize: number;
    sharedFiles: number;
    starredFiles: number;
    duplicatePercentage: number;
  };
  drives: any[];
  fileStats: any;
  lastUpdated: string;
}

// Duplicates related types
export interface DuplicateGroup {
  id: string;
  name: string;
  size: number;
  hash?: string;
  files: {
    _id: string;
    name: string;
    size: number;
    mimeType: string;
    webViewLink: string;
    iconLink: string;
    thumbnailUrl: string;
    modifiedTime: Date;
    driveAccountId: string;
    driveAccount: {
      _id: string;
      email: string;
      name: string;
      connectionStatus: string;
    };
    googleFileId: string;
  }[];
  totalWastedSpace: number;
}