// User & Authentication Types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

// Drive Types
export interface Drive {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  storageUsed: number;
  storageTotal: number;
  status: 'active' | 'expired' | 'syncing' | 'error';
  lastSyncedAt: string;
  fileCount: number;
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

export type FileType = 'document' | 'spreadsheet' | 'presentation' | 'image' | 'video' | 'audio' | 'pdf' | 'archive' | 'folder' | 'other';

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
  type: 'upload' | 'delete' | 'connect' | 'disconnect' | 'sync' | 'share';
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
  viewMode: 'grid' | 'list';
  paginationSize: 10 | 25 | 50 | 100;
  defaultDrive: string | 'all';
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
  totalFiles: number;
  totalStorageUsed: number;
  connectedDrives: number;
  duplicateFiles: number;
  duplicateSpace: number;
}
