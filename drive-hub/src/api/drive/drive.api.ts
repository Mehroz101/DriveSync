import { apiClient } from "../http/axios.client";
import type { DashboardStats, Drive, DriveAccount, DriveStatsResponse } from "@/types";

export const addGoogleDriveAccount = async (): Promise<{ authUrl: string }> => {
  try {
    const response = await apiClient.post("/auth/add-account");
    // New standardized response: { success: true, data: { authUrl: string } }
    return response.data.data || response.data;
  } catch (error) {
    console.error("Failed to add Google Drive account:", error);
    throw error;
  }
};

export const reconnectGoogleDriveAccount = async (driveId: string): Promise<{ authUrl: string }> => {
  try {
    const response = await apiClient.post("/auth/reconnect/"+driveId);
    // New standardized response: { success: true, data: { authUrl: string } }
    return response.data.data || response.data;
  } catch (error) {
    console.error("Failed to reconnect Google Drive account:", error);
    throw error;
  }
};

export const getGoogleDriveAccounts = async (): Promise<Drive[]> => {
  try {
    const response = await apiClient.get("/drive/get-all-drives");
    // New standardized response: { success: true, data: DriveAccount[] }
    return response.data.data || response.data;
  } catch (error) {
    console.error("Failed to get Google Drive accounts:", error);
    throw error;
  }
};

export const getAccountsRefetch = async (): Promise<DriveAccount[]> => {
  try {
    const response = await apiClient.get("/drive/sync-all");
    // New standardized response: { success: true, data: DriveAccount[] }
    return response.data.data || response.data;
  } catch (error) {
    console.error("Failed to refetch accounts:", error);
    throw error;
  }
};

export const getAccountRefetchById = async (
  driveId: string
): Promise<DriveAccount> => {
  try {
    const response = await apiClient.get(`/drive/sync-drive/${driveId}`);
    // New standardized response: { success: true, data: DriveAccount }
    return response.data.data || response.data;
  } catch (error) {
    console.error("Failed to refetch account by ID:", error);
    throw error;
  }
};

export const getAllDriveStats = async (): Promise<DriveStatsResponse> => {
  try {
    const response = await apiClient.get("/drive/stats");
    // New standardized response: { success: true, data: { drives: DriveAccount[], globalDuplicates: DuplicateStats } }
    const data = response.data.data || response.data;
    // Handle both old (array) and new (object with drives/globalDuplicates) shapes
    if (Array.isArray(data)) {
      return { drives: data, globalDuplicates: { duplicateGroups: 0, duplicateFiles: 0, wastedFiles: 0, wastedSpace: 0 } };
    }
    return data;
  } catch (error) {
    console.error("Failed to get drive stats:", error);
    throw error;
  }
};