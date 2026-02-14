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

export interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
  createdAt: string;
  status: "active" | "inactive";
  authType?: 'email' | 'google' | 'both';
}

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: User;
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
  name?: string | null;
  email?: string | null;
}

export interface DriveOwner {
  kind?: string;
  displayName?: string;
  name?: string;
  photoLink?: string;
  me?: boolean;
  permissionId?: string;
  emailAddress?: string;
  email?: string;
  _id?: string;
}

export interface DriveStorage {
  total: number;
  used: number;
  usedInDrive: number;
  usedInTrash: number;
  remaining: number;
}

export interface DriveStats {
  totalFiles: number;
  totalFolders: number;
  trashedFiles: number;
  duplicateFiles: number;
  duplicateSize: number;
  sharedFiles: number;
  starredFiles: number;
}

export interface DriveMeta {
  fetchedAt: string;
  source: string;
}

export interface DriveAccount {
  _id: string;
  userId: string;
  connectionStatus: "active" | "revoked" | "error" | "disconnected";
  owner: DriveOwner;
  storage: DriveStorage;
  stats: DriveStats;
  meta: DriveMeta;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiryDate: number;
  };
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriveFile {
  _id?: string;
  userId: ObjectId | string;
  driveAccountId: mongoose.Types.ObjectId | string;
  googleFileId: string | null;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  webContentLink: string | null;
  iconLink: string | null;
  thumbnailUrl: string | null;
  createdTime: Date | string | null;
  modifiedTime: Date | string | null;
  size: number;
  owners: Owner[];
  parents: string[];
  starred: boolean;
  trashed: boolean;
  shared: boolean;
  isDuplicate: boolean;
  description: string;
  driveAccount?: {
    _id: string;
    email: string;
    name: string;
    connectionStatus: string;
  };
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
    duplicateGroups: number;
    duplicateFiles: number;
    duplicateSize: number;
    sharedFiles: number;
    starredFiles: number;
    duplicatePercentage: number;
  };
  drives: DriveAccount[];
  fileStats: {
    totalFiles: number;
    duplicateGroups: number;
    duplicateFiles: number;
    duplicateSize: number;
    sharedFiles: number;
    starredFiles: number;
    mimeTypeStats: string[];
  };
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

// Analytics types
export interface StorageAnalytics {
  driveId: string;
  owner: {
    displayName: string;
    emailAddress: string | null;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  stats: DriveStats | Record<string, never>;
}

export interface FileTypeDistribution {
  mimeType: string;
  count: number;
  size: number;
  percentage: number;
}

export interface DriveUsageStats {
  totalDrives: number;
  activeDrives: number;
  revokedDrives: number;
  disconnectedDrives: number;
  storageByStatus: {
    active: number;
    revoked: number;
    disconnected: number;
  };
  averageStorageUsage: number;
}