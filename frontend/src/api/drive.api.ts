import type { DriveFile, DriveAccount } from "../types/drive.types";
import { apiClient } from "./axios.client";

// Fetch drive files for authenticated user (no userId parameter needed)
export const fetchDriveFiles = async (): Promise<DriveFile[]> => {
  const { data } = await apiClient.get("/api/drive/files");
  return data.files;
};

// API functions for managing drive accounts
export const fetchDriveAccounts = async (): Promise<DriveAccount[]> => {
  const { data } = await apiClient.get("/api/drive/accounts");
  return data.accounts;
};

export const addDriveAccount = async (): Promise<{ authUrl: string }> => {
  const { data } = await apiClient.post("/api/drive/accounts");
  return data;
};

export const removeDriveAccount = async (
  accountId: string
): Promise<{ message: string }> => {
  const { data } = await apiClient.delete(
    `/api/drive/accounts/${accountId}`
  );
  return data;
};

export const syncDriveFiles = async (): Promise<{ message: string; totalFilesSynced: number; accountsSynced: number }> => {
  const { data } = await apiClient.post("/api/drive/sync");
  return data;
};

// Search API - query from query params, no userId in URL
export const searchDriveFiles = async (
  query: string
): Promise<DriveFile[]> => {
  const { data } = await apiClient.get(
    `/api/search?query=${encodeURIComponent(query)}`
  );
  return data.results;
};
