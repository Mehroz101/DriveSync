import type { GoogleUser } from "../types/user.types";
import { apiClient } from "./axios.client";



export const fetchGoogleUser = async (userId:string): Promise<GoogleUser> => {
  const { data } = await apiClient.get<GoogleUser>("/api/profile/" + userId);
  return data;
};
