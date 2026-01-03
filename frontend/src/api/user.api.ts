import type { GoogleUser } from "../types/user.types";
import { apiClient } from "./axios.client";



export const fetchGoogleUser = async (userId:string): Promise<GoogleUser> => {
  console.log("=============fetchGoogleUser=============");
  console.log("fetchGoogleUser userId", userId)
  const { data } = await apiClient.get<GoogleUser>("/api/drive/profile/" + userId);
  return data;
};
