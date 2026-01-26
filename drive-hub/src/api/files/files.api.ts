import { apiClient } from "../http/axios.client";
import type { DriveFile } from "@/types";

export interface FilesApiPagination {
  page: number;
  limit: number;
  totalFiles: number;
  totalPages: number;
}

export type FilesApiResponse =
  | DriveFile[]
  | { files: DriveFile[]; pagination: FilesApiPagination };

export interface FilesQuery {
  page?: number;
  limit?: number;
  driveId?: string;
  search?: string;
  mimeType?: string;
  orderBy?: string;
  mimeTypes?: string[];
  sort?: "asc" | "desc";
  // Tag filters
  shared?: boolean;
  starred?: boolean;
  trashed?: boolean;
  // Size filters
  sizeMin?: number;
  sizeMax?: number;
  // Date filter
  modifiedAfter?: string;
  // allow other optional filters while avoiding `any`
  [key: string]: string | number | boolean | undefined | string[];
}

export const allDrivesFiles = async (
  query: FilesQuery = {},
  signal?: AbortSignal
): Promise<FilesApiResponse> => {
  const { mimeTypes, ...params } = query;

  
  const response = await apiClient.post<FilesApiResponse>(
    "/file/get-all-files",
    { mimeTypes },
    {
      params,
      signal,
      timeout: 15000,
    }
  );

  const data = response.data as FilesApiResponse;

  // Backend may return { files, pagination } or just files array
  if (Array.isArray(data)) return data;
  return data && "files" in data
    ? { files: data.files, pagination: data.pagination }
    : data;
};

export const allDrivesFilesSync = async (): Promise<DriveFile[]> => {
  try {
    const response = await apiClient.post("/file/get-all-files-sync");
    return response.data.files;
  } catch (error) {
    console.log(error);
  }
};

export interface DeleteFilesResponse {
  success: boolean;
  deletedCount?: number;
  failedFiles?: { fileId: string; reason?: string }[];
  revokedAccounts?: { id: string; email?: string }[];
  error?: string;
}

export const deleteFilesAPI = async (
  data: { fileId: string; driveId: string }[]
): Promise<DeleteFilesResponse> => {
  try {
    const response = await apiClient.post<DeleteFilesResponse>("/file/delete-files", data);
    // Return the backend's full response so callers can show details (deletedCount, failedFiles)
    return response.data;
  } catch (error: unknown) {
    console.log(error);
    const message = error instanceof Error ? error.message : "Request failed";
    return { success: false, error: message };
  }
};
