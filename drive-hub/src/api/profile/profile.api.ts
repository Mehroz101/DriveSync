import { apiClient } from "../http/axios.client";
import type { User } from "@/types";

export const getProfile = async (): Promise<User> => {
  const response = await apiClient.get("/profile");
  return response.data.data || response.data;
};

export const updateProfile = async (data: { name?: string; email?: string }): Promise<User> => {
  const response = await apiClient.put("/profile", data);
  return response.data.data || response.data;
};

export const uploadProfilePicture = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<User> => {
  const formData = new FormData();
  formData.append("picture", file);

  const response = await apiClient.post("/profile/picture", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return response.data.data || response.data;
};

export const changePassword = async (data: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> => {
  await apiClient.put("/profile/password", data);
};

export const deleteAccount = async (password?: string): Promise<void> => {
  await apiClient.delete("/profile", { data: { password } });
};
