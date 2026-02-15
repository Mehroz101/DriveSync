import { apiClient } from "../http/axios.client";
import type { DriveFile } from "@/types";

export interface FilesApiPagination {
  page: number;
  limit: number;
  totalFiles: number;
  totalPages: number;
}

export interface ApiFileResponse {
  success: boolean;
  data?: DriveFile[];
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    hasMore?: boolean;
  };
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

  const response = await apiClient.post<ApiFileResponse | DriveFile[]>(
    "/file/get-all-files",
    { mimeTypes },
    {
      params,
      signal,
      timeout: 15000,
    }
  );

  const data = response.data as unknown;

  // New standardized response: { success: true, data: DriveFile[], meta: {...} }
  if (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    (data as ApiFileResponse).success &&
    'data' in data &&
    Array.isArray((data as ApiFileResponse).data)
  ) {
    return {
      files: (data as ApiFileResponse).data || [],
      pagination: {
        page: (data as ApiFileResponse).meta?.page ?? 1,
        limit: (data as ApiFileResponse).meta?.pageSize ?? 25,
        totalFiles: (data as ApiFileResponse).meta?.total ?? 0,
        totalPages: Math.ceil(((data as ApiFileResponse).meta?.total ?? 0) / ((data as ApiFileResponse).meta?.pageSize ?? 25)),
      },
    };
  }

  // Array format fallback
  if (Array.isArray(data)) {
    return data;
  }

  // Old format fallback: { files: DriveFile[], pagination: ... }
  if (
    typeof data === 'object' &&
    data !== null &&
    'files' in data &&
    Array.isArray((data as { files: DriveFile[] }).files)
  ) {
    return data as { files: DriveFile[]; pagination: FilesApiPagination };
  }

  return [];
};

export const allDrivesFilesSync = async (): Promise<DriveFile[]> => {
  try {
    const response = await apiClient.post<ApiFileResponse | { files: DriveFile[] }>(
      "/file/get-all-files-sync"
    );
    const data = response.data as unknown;
    
    // New standardized response: { success: true, data: { files: [], syncResults: {...} } }
    if (
      typeof data === 'object' &&
      data !== null &&
      'success' in data &&
      (data as ApiFileResponse).success &&
      'data' in data
    ) {
      const fileData = (data as ApiFileResponse).data;
      return Array.isArray(fileData) ? fileData : [];
    }
    
    // Old format: { files: DriveFile[] }
    if (
      typeof data === 'object' &&
      data !== null &&
      'files' in data &&
      Array.isArray((data as { files: DriveFile[] }).files)
    ) {
      return (data as { files: DriveFile[] }).files;
    }
    
    return [];
  } catch (error) {
    console.error("Failed to sync all drives files:", error);
    return [];
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
    const response = await apiClient.post<{ success: boolean; data?: DeleteFilesResponse } | DeleteFilesResponse>("/file/delete-files", data);
    // New standardized response: { success: true, data: DeleteFilesResponse }
    const responseData = response.data as { success: boolean; data?: DeleteFilesResponse } | DeleteFilesResponse;
    return 'data' in responseData && responseData.data ? responseData.data : responseData;
  } catch (error: unknown) {
    console.error("Failed to delete files:", error);
    const message = error instanceof Error ? error.message : "Request failed";
    return { success: false, error: message };
  }
};

export const permanentlyDeleteTrashedFilesAPI = async (
  data: { fileId: string; driveId: string }[]
): Promise<DeleteFilesResponse> => {
  try {
    const response = await apiClient.post<{ success: boolean; data?: DeleteFilesResponse } | DeleteFilesResponse>(
      "/file/permanently-delete-trashed",
      data
    );
    // New standardized response: { success: true, data: DeleteFilesResponse }
    const responseData = response.data as unknown;
    
    if (
      typeof responseData === 'object' &&
      responseData !== null &&
      'data' in responseData &&
      (responseData as { data?: DeleteFilesResponse }).data
    ) {
      return (responseData as { data: DeleteFilesResponse }).data;
    }
    
    return responseData as DeleteFilesResponse;
  } catch (error: unknown) {
    console.error("Failed to permanently delete trashed files:", error);
    const message = error instanceof Error ? error.message : "Request failed";
    return { success: false, error: message };
  }
};

export const uploadFileAPI = async (
  file: File,
  driveId: string,
  onProgress?: (progress: number) => void
): Promise<DriveFile> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('driveId', driveId);

  const response = await apiClient.post<{ success: boolean; data?: DriveFile; file?: DriveFile }>(
    "/file/upload",
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    }
  );

  if (!response.data.success) {
    throw new Error('Upload failed');
  }

  // Extract file from standardized response: { success: true, data: DriveFile } or old format: { file: DriveFile }
  return response.data.data || response.data.file || ({} as DriveFile);
};

// ---- Folder Navigation APIs ----

export interface FolderContentsResponse {
  files: DriveFile[];
  breadcrumbs?: { id: string; name: string }[];
  pagination: FilesApiPagination;
}

export const getFolderContents = async (
  parentId?: string,
  query: FilesQuery = {},
  signal?: AbortSignal
): Promise<FolderContentsResponse> => {
  const params: Record<string, string | number> = {
    page: query.page ?? 1,
    limit: query.limit ?? 50,
  };
  if (query.driveId) params.driveId = query.driveId;

  if (parentId && parentId !== 'root') {
    const response = await apiClient.get<{ success: boolean; data: FolderContentsResponse }>(
      `/file/folder/${parentId}`,
      { params, signal, timeout: 15000 }
    );
    return response.data.data;
  }

  // Root level
  const response = await apiClient.get<{ success: boolean; data: DriveFile[]; meta?: { page?: number; total?: number; limit?: number; totalPages?: number } }>(
    "/file/folder",
    { params, signal, timeout: 15000 }
  );

  const data = response.data;
  return {
    files: data.data || [],
    breadcrumbs: [],
    pagination: {
      page: data.meta?.page ?? 1,
      limit: data.meta?.limit ?? 50,
      totalFiles: data.meta?.total ?? 0,
      totalPages: data.meta?.totalPages ?? 1,
    },
  };
};

/**
 * Get the proxy URL for previewing a file (image, video, audio).
 * This proxies through our backend to avoid Google CORS issues.
 */
export const getFilePreviewUrl = (googleFileId: string, accountId: string): string => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  const token = localStorage.getItem("token");
  return `${baseUrl}/file/preview/${googleFileId}?accountId=${accountId}&token=${token}`;
};
