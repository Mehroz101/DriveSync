// Shared types for DriveSync application
// Single source of truth for all TypeScript interfaces

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
  createdAt: string;
  status: "active" | "inactive";
  authType?: 'email' | 'google' | 'both';
}

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

// ============================================================================
// DRIVE ACCOUNT TYPES
// ============================================================================

export interface DriveOwner {
  kind?: string;
  displayName?: string;
  name?: string; // alias for displayName
  photoLink?: string;
  me?: boolean;
  permissionId?: string;
  emailAddress?: string;
  email?: string; // alias for emailAddress
  _id?: string;
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
  sharedFiles: number;
  starredFiles: number;
}

export interface DriveMeta {
  fetchedAt: string; // ISO date string
  source: string; // e.g., 'google-drive-api'
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

// Legacy alias for backward compatibility
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

// ============================================================================
// FILE TYPES
// ============================================================================

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

export interface DriveFile {
  _id?: string;
  userId: string;
  driveAccountId: string;
  googleFileId: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailUrl?: string;
  createdTime?: Date | string;
  modifiedTime?: Date | string;
  size: number;
  owners: DriveOwner[];
  parents: string[];
  starred: boolean;
  trashed: boolean;
  shared: boolean;
  isDuplicate?: boolean;
  description?: string;
  type?: FileType; // computed field
  
  // Backend may include populated drive info
  driveAccount?: DriveAccount;
  
  // Frontend convenience aliases
  driveId?: string;
  driveName?: string;
  owner?: string; // primary owner name
  lastModified?: string; // alias for modifiedTime
}

// ============================================================================
// DUPLICATE TYPES
// ============================================================================

export interface DuplicateGroup {
  id: string;
  name: string;
  size: number;
  hash?: string;
  files: Array<DriveFile & {
    driveAccount: {
      _id: string;
      email: string;
      name: string;
      connectionStatus: string;
    };
  }>;
  totalWastedSpace: number;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

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
  drives: DriveAccount[];
  fileStats: {
    totalFiles: number;
    duplicateFiles: number;
    duplicateSize: number;
    sharedFiles: number;
    starredFiles: number;
    mimeTypeStats: string[];
  };
  lastUpdated: string;
}

export interface StorageAnalytics {
  driveId: string;
  owner: {
    displayName: string;
    emailAddress: string;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  stats: DriveStats;
}

export interface FileTypeDistribution {
  mimeType: string;
  count: number;
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

// ============================================================================
// API TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  data?: T;
  success: boolean;
  message?: string;
  error?: string;
  errors?: ApiError[];
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
  field?: string;
  details?: Record<string, unknown>;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FileFilter {
  search?: string;
  driveIds?: string[];
  types?: FileType[];
  mimeTypes?: string[];
  minSize?: number;
  maxSize?: number;
  dateFrom?: string;
  dateTo?: string;
  duplicatesOnly?: boolean;
  trashedOnly?: boolean;
  sharedOnly?: boolean;
  starredOnly?: boolean;
}

// ============================================================================
// ACTIVITY TYPES
// ============================================================================

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
  userId: string;
}

// ============================================================================
// USER PREFERENCES TYPES
// ============================================================================

export interface UserPreferences {
  viewMode: "grid" | "list";
  paginationSize: 10 | 25 | 50 | 100;
  defaultDrive: string | "all";
  notifications: boolean;
  autoSync: boolean;
  theme?: "light" | "dark" | "system";
}

// ============================================================================
// BULK OPERATION TYPES
// ============================================================================

export interface BulkWriteOperation {
  updateOne: {
    filter: {
      googleFileId: string;
      driveAccountId: string;
    };
    update: {
      $set: Partial<DriveFile>;
    };
    upsert: boolean;
  };
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  errors: ApiError[];
}

// ============================================================================
// HTTP REQUEST/RESPONSE TYPES
// ============================================================================

export interface AuthenticatedRequest {
  userId: string;
  userEmail: string;
}

// ============================================================================
// VALIDATION SCHEMAS (for runtime validation)
// ============================================================================

export interface ValidationSchema {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: readonly string[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: unknown;
}

// ============================================================================
// EXPORT ALL TYPES (End of file)
// ============================================================================
