import type { DriveFile, DriveAccount } from "../types/drive.types";
import { apiClient } from "./axios.client";

export const fetchDriveFiles = async (
  userId: string
): Promise<DriveFile[]> => {
  const { data } = await apiClient.get(
    `/api/drive/files/${userId}`
  );
  return data.files;
};

// API functions for managing drive accounts
export const fetchDriveAccounts = async (
  userId: string
): Promise<DriveAccount[]> => {
  const { data } = await apiClient.get(
    `/api/drive/accounts/${userId}`
  );
  return data.accounts;
};

export const addDriveAccount = async (
  userId: string
): Promise<{ authUrl: string }> => {
  const { data } = await apiClient.post(
    `/api/drive/accounts/${userId}`
  );
  return data;
};
// http://localhost:5173/auth/add-drive-account?userId=6957e635bb0b94c8f3c43b24
export const removeDriveAccount = async (
  accountId: string
): Promise<{ message: string }> => {
  const { data } = await apiClient.delete(
    `/api/drive/accounts/${accountId}`
  );
  return data;
};

export const syncDriveFiles = async (
  userId: string
): Promise<{ message: string; totalFilesSynced: number; accountsSynced: number }> => {
  const { data } = await apiClient.post(
    `/api/drive/sync/${userId}`
  );
  return data;
};

// Search API
export const searchDriveFiles = async (
  userId: string,
  query: string
): Promise<DriveFile[]> => {
  const { data } = await apiClient.get(
    `/api/search/${userId}?query=${encodeURIComponent(query)}`
  );
  return data.results;
};
