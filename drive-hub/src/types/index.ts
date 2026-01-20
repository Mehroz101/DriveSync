// User & Authentication Types
export interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
  createdAt: string;
  status: "active" | "inactive";
}
// types/drive.ts or wherever you keep your types
export interface DriveOwner {
  kind: string; // 'drive#user'
  displayName: string;
  photoLink: string;
  me: boolean;
  permissionId: string;
  emailAddress: string;
}

export interface DriveStorage {
  total: number; // in bytes
  used: number; // total used in bytes
  usedInDrive: number; // used in drive in bytes
  usedInTrash: number; // used in trash in bytes
  remaining: number; // remaining space in bytes
}

export interface DriveStats {
  totalFiles: number;
  totalFolders: number;
  trashedFiles: number;
  duplicateFiles: number;
}

export interface DriveMeta {
  fetchedAt: string; // ISO date string
  source: string; // e.g., 'google-drive-api'
}

export interface DriveAccount {
  owner: DriveOwner;
  storage: DriveStorage;
  stats: DriveStats;
  meta: DriveMeta;
}

// Drive Types
export interface Drive {
  _id: string;
  name: string;
  email: string;
  profileImg?: string;
  storage: {
    remaining: number;
    total: number;
    usagePercentage: number;
    used: number;
  };
  connectionStatus: 'critical' | 'warning' | 'healthy' | 'error' | 'inactive';
  lastFetched: string;
}

// File Types
export interface DriveFile {
  id: string;
  name: string;
  driveId: string;
  driveName: string;
  size: number;
  type: FileType;
  mimeType: string;
  lastModified: string;
  owner: string;
  isDuplicate: boolean;
  thumbnailUrl?: string;
}

export type FileType =
  | "document"
  | "spreadsheet"
  | "presentation"
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "archive"
  | "folder"
  | "other";

// Duplicate Types
export interface DuplicateGroup {
  id: string;
  name: string;
  size: number;
  hash: string;
  files: DriveFile[];
  totalWastedSpace: number;
}

// Activity Types
export interface Activity {
  id: string;
  type: "upload" | "delete" | "connect" | "disconnect" | "sync" | "share";
  description: string;
  driveId?: string;
  driveName?: string;
  fileId?: string;
  fileName?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Analytics Types
export interface StorageAnalytics {
  date: string;
  totalStorage: number;
  usedStorage: number;
}

export interface FileTypeDistribution {
  type: FileType;
  count: number;
  size: number;
  percentage: number;
}

export interface DriveUsageStats {
  driveId: string;
  driveName: string;
  storageUsed: number;
  storageTotal: number;
  fileCount: number;
  percentage: number;
}

// Settings Types
export interface UserPreferences {
  viewMode: "grid" | "list";
  paginationSize: 10 | 25 | 50 | 100;
  defaultDrive: string | "all";
  notifications: boolean;
  autoSync: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: ApiError;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Filter Types
export interface FileFilter {
  search?: string;
  driveIds?: string[];
  types?: FileType[];
  minSize?: number;
  maxSize?: number;
  dateFrom?: string;
  dateTo?: string;
  duplicatesOnly?: boolean;
}

// Stats Types
export interface DashboardStats {
  _id: string;
  connectionStatus: "active" | "revoked" | "error";
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
    fetchedAt: string;
    source: string;
  };
}
