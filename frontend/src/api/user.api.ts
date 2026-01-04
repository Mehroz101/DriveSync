import type { GoogleUser } from "../types/user.types";
import { apiClient } from "./axios.client";

// Fetch Google user profile for authenticated user (no userId parameter)
export const fetchGoogleUser = async (): Promise<GoogleUser> => {
  console.log("=============fetchGoogleUser=============");
  const { data } = await apiClient.get<GoogleUser>("/api/drive/profile");
  return data;
};
