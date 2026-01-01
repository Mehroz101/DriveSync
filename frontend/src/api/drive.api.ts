import type { DriveFile } from "../types/drive.types";
import { apiClient } from "./axios.client";

export const fetchDriveFiles = async (
  userId: string
): Promise<DriveFile[]> => {
  const { data } = await apiClient.get(
    `/api/drive/files/${userId}`
  );
  return data;
};
