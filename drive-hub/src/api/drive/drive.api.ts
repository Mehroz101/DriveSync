import { apiClient } from "../http/axios.client";
import type { Drive } from "@/types";

export const addGoogleDriveAccount = async (): Promise<{ authUrl: string }> => {
  try {
    const response = await apiClient.post("/auth/add-account");
    console.log(response);
    return response.data;
  } catch (error) {
    console.log(error);
  }
};
export const getGoogleDriveAccounts = async (): Promise<{
  count: number;
  accounts: Drive[];
}> => {
  try {
    const response = await apiClient.get("/drive/get-all-drives");
    console.log(response);
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
