import type {
  User,
  Drive,
  DriveFile,
  DuplicateGroup,
  Activity,
  StorageAnalytics,
  FileTypeDistribution,
  DriveUsageStats,
  DashboardStats,
  UserPreferences,
  ApiResponse,
  FileFilter,
} from '@/types';
import {
  currentUser,
  drives,
  files,
  duplicateGroups,
  activities,
  storageAnalytics,
  fileTypeDistribution,
  driveUsageStats,
  dashboardStats,
  userPreferences,
} from '@/data/mockData';
import { apiClient } from '@/api/http/axios.client';

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================
// AUTHENTICATION API
// ============================================

export async function getCurrentUser(): Promise<ApiResponse<User>> {
  await delay(300);
  return {
    data: currentUser,
    success: true,
  };
}

// ============================================
// DRIVES API
// ============================================

export async function getDrives(): Promise<ApiResponse<Drive[]>> {
  await delay(400);
  return {
    data: drives,
    success: true,
    meta: { total: drives.length },
  };
}

export async function getDriveById(id: string): Promise<ApiResponse<Drive | null>> {
  await delay(300);
  const drive = drives.find(d => d._id === id) || null;
  return {
    data: drive,
    success: !!drive,
    message: drive ? undefined : 'Drive not found',
  };
}

export async function connectDrive(authCode: string, name: string): Promise<ApiResponse<Drive>> {
  await delay(1000);
  // Simulate creating a new drive
  const newDrive: Drive = {
    _id: `drive-${Date.now()}`,
    name,
    email: 'new@drive.com',
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
    storageUsed: 0,
    storageTotal: 15 * 1024 * 1024 * 1024,
    status: 'syncing',
    lastSyncedAt: new Date().toISOString(),
    fileCount: 0,
  };
  return {
    data: newDrive,
    success: true,
  };
}

export async function disconnectDrive(id: string): Promise<ApiResponse<null>> {
  await delay(500);
  return {
    data: null,
    success: true,
    message: 'Drive disconnected successfully',
  };
}

export async function refreshDrive(id: string): Promise<ApiResponse<Drive>> {
  await delay(2000);
  const drive = drives.find(d => d._id === id);
  if (!drive) {
    return {
      data: null,
      success: false,
      message: 'Drive not found',
    };
  }
  return {
    data: { ...drive, lastSyncedAt: new Date().toISOString() },
    success: true,
  };
}

// ============================================
// FILES API
// ============================================

export async function getFiles(filter?: FileFilter): Promise<ApiResponse<DriveFile[]>> {
  await delay(500);
  
  let filteredFiles = [...files];
  
  if (filter) {
    if (filter.search) {
      const search = filter.search.toLowerCase();
      filteredFiles = filteredFiles.filter(f => 
        f.name.toLowerCase().includes(search)
      );
    }
    
    if (filter.driveIds && filter.driveIds.length > 0) {
      filteredFiles = filteredFiles.filter(f => 
        filter.driveIds!.includes(f.driveId)
      );
    }
    
    if (filter.types && filter.types.length > 0) {
      filteredFiles = filteredFiles.filter(f => 
        filter.types!.includes(f.type)
      );
    }
    
    if (filter.duplicatesOnly) {
      filteredFiles = filteredFiles.filter(f => f.isDuplicate);
    }
  }
  
  return {
    data: filteredFiles,
    success: true,
    meta: {
      total: filteredFiles.length,
      page: 1,
      pageSize: 25,
      hasMore: false,
    },
  };
}

export async function getFileById(id: string): Promise<ApiResponse<DriveFile | null>> {
  await delay(300);
  const file = files.find(f => f._id === id) || null;
  return {
    data: file,
    success: !!file,
  };
}

export async function uploadFile(
  driveId: string, 
  fileName: string, 
  size: number
): Promise<ApiResponse<DriveFile>> {
  await delay(1500);
  const newFile: DriveFile = {
    _id: `file-${Date.now()}`,
    name: fileName,
    driveId,
    driveName: drives.find(d => d._id === driveId)?.name || 'Unknown',
    size,
    type: 'document',
    mimeType: 'application/octet-stream',
    lastModified: new Date().toISOString(),
    owner: currentUser.email,
    isDuplicate: false,
  };
  return {
    data: newFile,
    success: true,
  };
}

export async function deleteFile(id: string): Promise<ApiResponse<null>> {
  await delay(500);
  return {
    data: null,
    success: true,
    message: 'File deleted successfully',
  };
}

export async function deleteFiles(ids: string[]): Promise<ApiResponse<null>> {
  await delay(800);
  return {
    data: null,
    success: true,
    message: `${ids.length} files deleted successfully`,
  };
}

// ============================================
// DUPLICATES API
// ============================================

export async function getDuplicates(): Promise<ApiResponse<DuplicateGroup[]>> {
  await delay(600);
  return {
    data: duplicateGroups,
    success: true,
    meta: {
      total: duplicateGroups.length,
    },
  };
}

export async function scanForDuplicates(): Promise<ApiResponse<{ jobId: string }>> {
  await delay(500);
  return {
    data: { jobId: `scan-${Date.now()}` },
    success: true,
    message: 'Duplicate scan started',
  };
}

// ============================================
// ACTIVITY API
// ============================================

export async function getActivities(filter?: {
  types?: Activity['type'][];
  driveId?: string;
}): Promise<ApiResponse<Activity[]>> {
  await delay(400);
  
  let filteredActivities = [...activities];
  
  if (filter?.types && filter.types.length > 0) {
    filteredActivities = filteredActivities.filter(a => 
      filter.types!.includes(a.type)
    );
  }
  
  if (filter?.driveId) {
    filteredActivities = filteredActivities.filter(a => 
      a.driveId === filter.driveId
    );
  }
  
  return {
    data: filteredActivities,
    success: true,
    meta: { total: filteredActivities.length },
  };
}

// ============================================
// ANALYTICS API
// ============================================

export async function getStorageAnalytics(
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<StorageAnalytics[]>> {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get(`/analytics/storage-analytics?${params.toString()}`);
    return {
      data: response.data.data,
      success: response.data.success,
    };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch storage analytics' }
    };
  }
}

export async function getFileTypeDistribution(): Promise<ApiResponse<FileTypeDistribution[]>> {
  try {
    const response = await apiClient.get('/analytics/file-type-distribution');
    return {
      data: response.data.data,
      success: response.data.success,
    };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch file type distribution' }
    };
  }
}

export async function getDriveUsageStats(): Promise<ApiResponse<DriveUsageStats[]>> {
  try {
    const response = await apiClient.get('/analytics/drive-usage-stats');
    return {
      data: response.data.data,
      success: response.data.success,
    };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch drive usage stats' }
    };
  }
}

export async function getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  try {
    const response = await apiClient.get('/analytics/dashboard-stats');
    return {
      data: response.data.data,
      success: response.data.success,
    };
  } catch (error) {
    return {
      data: null,
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch dashboard stats' }
    };
  }
}

export async function getAnalyticsFiles(): Promise<ApiResponse<DriveFile[]>> {
  try {
    const response = await apiClient.get('/analytics/files?limit=100');
    return {
      data: response.data.data,
      success: response.data.success,
    };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch files' }
    };
  }
}

// ============================================
// SETTINGS API
// ============================================

export async function getUserPreferences(): Promise<ApiResponse<UserPreferences>> {
  await delay(300);
  return {
    data: userPreferences,
    success: true,
  };
}

export async function updateUserPreferences(
  preferences: Partial<UserPreferences>
): Promise<ApiResponse<UserPreferences>> {
  await delay(500);
  const updated = { ...userPreferences, ...preferences };
  return {
    data: updated,
    success: true,
    message: 'Preferences updated successfully',
  };
}

export async function updateUserProfile(
  profile: Partial<User>
): Promise<ApiResponse<User>> {
  await delay(500);
  const updated = { ...currentUser, ...profile };
  return {
    data: updated,
    success: true,
    message: 'Profile updated successfully',
  };
}
