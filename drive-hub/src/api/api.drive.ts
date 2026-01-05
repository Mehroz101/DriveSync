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
export const getGoogleDriveAccounts  = async () => {
  try {
    const response = await apiClient.get("/drive/get-all-drives");
    console.log(response);
    return response;
  } catch (error) {
    console.log(error);
  }
};
