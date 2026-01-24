import { apiClient } from "../http/axios.client";
import type { DashboardStats, Drive } from "@/types";

export const addGoogleDriveAccount = async (): Promise<{ authUrl: string }> => {
  try {
    const response = await apiClient.post("/auth/add-account");
    console.log(response);
    return response.data;
  } catch (error) {
    console.log(error);
  }
};
export const reconnectGoogleDriveAccount = async (driveId: string): Promise<{ authUrl: string }> => {
  try {
    const response = await apiClient.post("/auth/reconnect/"+driveId);
    console.log(response);
    return response.data;
  } catch (error) {
    console.log(error);
  }
};
export const getGoogleDriveAccounts = async (): Promise<Drive[]> => {
  try {
    const response = await apiClient.get("/drive/get-all-drives");
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
export const getAccountsRefetch = async (): Promise<DashboardStats[]> => {
  try {
    const response = await apiClient.get("/drive/sync-all");
    console.log(response);
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
export const getAccountRefetchById = async (
  driveId: string
): Promise<{ count: number; accounts: Drive[] }> => {
  try {
    const response = await apiClient.get(`/drive/sync-drive/${driveId}`);
    console.log(response);
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
export const getAllDriveStats = async (): Promise<DashboardStats[]> => {
  try {
    const response = await apiClient.get("/drive/stats");
    console.log(response);
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};