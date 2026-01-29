// filepath: /Users/macintosh/Documents/GitHub/DriveSync/drive-hub/src/api/analytics/analytics.api.ts
import { apiClient } from "../http/axios.client";
import type {
  StorageAnalytics,
  FileTypeDistribution,
  DriveUsageStats,
  DriveFile,
  DashboardStats
} from "@/types";

export const getStorageAnalytics = async (
  startDate?: string,
  endDate?: string
): Promise<StorageAnalytics[]> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get(`/analytics/storage-analytics?${params.toString()}`);
    return response.data.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getFileTypeDistribution = async (): Promise<FileTypeDistribution[]> => {
  try {
    const response = await apiClient.get('/analytics/file-type-distribution');
    return response.data.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getDriveUsageStats = async (): Promise<DriveUsageStats[]> => {
  try {
    const response = await apiClient.get('/analytics/drive-usage-stats');
    return response.data.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const response = await apiClient.get('/analytics/dashboard-stats');
    return response.data.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getAnalyticsFiles = async (): Promise<DriveFile[]> => {
  try {
    const response = await apiClient.get('/analytics/files?limit=100');
    return response.data.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};