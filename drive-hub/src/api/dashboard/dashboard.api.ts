import { apiClient } from "../http/axios.client";
import type { DashboardStats } from "@/types";

export const getDashboardStates = async (): Promise<DashboardStats[]> => {
  try {
    const response = await apiClient.get("/dashboard/states");
    console.log(response);
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};