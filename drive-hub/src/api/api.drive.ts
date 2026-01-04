import { apiClient } from "./axios.client";

export const addGoogleDriveAccount = async () => {
  try {
    const response = await apiClient.post("/auth/add-account");
    console.log(response);
    return response;
  } catch (error) {
    console.log(error);
  }
};
