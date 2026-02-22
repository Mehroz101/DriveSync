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
  // kind?: string; // optional: 'drive#user'
  displayName?: string;
  photoLink?: string;
  // me?: boolean;
  // permissionId?: string;
  emailAddress?: string;
  _id?: string; // backend sometimes returns an internal id
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
  duplicateSize: number;
}

// Unified duplicate calculation stats
export interface DuplicateStats {
  duplicateGroups: number;  // Number of distinct (name, size) groups with count > 1
  duplicateFiles: number;   // Total individual files in all groups
  wastedFiles: number;      // Files that could be removed (duplicateFiles - duplicateGroups)
  wastedSpace: number;      // Bytes recoverable = Σ (count-1) * size per group
}

export interface DriveMeta {
  fetchedAt: string; // ISO date string
  source: string; // e.g., 'google-drive-api'
}

// Response shape from /drive/stats endpoint
export interface DriveStatsResponse {
  drives: DriveAccount[];
  globalDuplicates: DuplicateStats;
}

export interface DriveAccount {
  _id: string;
  connectionStatus: "active" | "revoked" | "error";
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
  connectionStatus: "active" | "revoked" | "error";
  lastFetched: string;
  lastSyncedAt?: string;
}

// Normalized DriveFile shape (backend may send _id, driveAccountId, nested drive info, owners, etc.)
export interface DriveFile {
  _id?: string;
  googleFileId?: string;
  driveAccountId?: string;
  driveId?: string;
  driveName?: string;
  // optional nested drive info returned by backend
  driveAccount?: Drive;
  name: string;
  size: number;
  type?: FileType;
  mimeType?: string;
  modifiedTime?: string;
  lastModified?: string; // alias
  owner?: string;
  owners?: DriveOwner[];
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  isDuplicate?: boolean;
  thumbnailUrl?: string;
  shared?: boolean;
  starred?: boolean;
  trashed?: boolean;
  parents?: string[];
  isFolder?: boolean;
  // nested drive info from $lookup
  drive?: {
    email?: string;
    connectionStatus?: string;
  };
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

// Activity Log Types (from backend ActivityLog model)
export interface PerformanceTiming {
  label: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
}

export interface ActivityLog {
  _id: string;
  performerId: string;
  performerType: "User" | "System";
  performerUsername?: string;
  performerEmail?: string;

  actionType: string;
  details?: string;

  targetId?: string;
  targetType?: string;
  targetName?: string;

  ipAddress?: string;
  userAgent?: string;

  status: "success" | "failure" | "pending" | "partial";
  errorMessage?: string;

  durationMs?: number;
  timings?: PerformanceTiming[];
  metadata?: Record<string, unknown>;

  httpMethod?: string;
  httpPath?: string;
  httpStatusCode?: number;

  createdAt: string;
  updatedAt: string;
}

export interface ActivityLogAggregations {
  actionCounts: Array<{ _id: string; count: number }>;
  statusCounts: Array<{ _id: string; count: number }>;
  avgDurations: Array<{ _id: string; avgDuration: number; minDuration?: number; maxDuration?: number; count: number }>;
  dailyTrend: Array<{ _id: string; count: number; avgDuration: number; errors?: number }>;
  topActions: Array<{ _id: string; count: number; avgDuration: number; lastOccurred: string }>;
}

// Analytics Types
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
  stats: {
    totalFiles: number;
    duplicateFiles: number;
    duplicateSize: number;
    totalSize: number;
  };
}

export interface FileTypeDistribution {
  mimeType: string;
  count: number;
  percentage: number;
  size?: number;
}

export interface DriveUsageStatsResponse {
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

// Keep the original for chart data transformation
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
  };
  lastUpdated: string;
}

// Legacy flat format for backward compatibility
export interface DashboardStatsFlat {
  totalFiles: number;
  totalStorageUsed: number;
  connectedDrives: number;
  duplicateFiles: number;
  duplicateSpace: number;
}
