import { allDrivesFiles, allDrivesFilesSync } from "@/api/files/files.api";
import { filesKey } from "@/api/files/files.keys";
import { useQuery } from "@tanstack/react-query";

export const useAllDrivesFiles = (queryParams: {
  page?: number;
  limit?: number;
  search?: string;
  driveId?: string;
  driveStatus?: string;
  mimeTypes?: string[];
} = {}) => {
  // Destructure and provide defaults
  const { page = 1, limit = 50, search, driveId, driveStatus, mimeTypes } = queryParams;

  return useQuery({
    queryKey: filesKey.list({
      page,
      limit,
      search,
      driveId,
      driveStatus,
      mimeTypes,
    }), // cache by params
    queryFn: ({ signal }) =>
      allDrivesFiles({ page, limit, search, driveId, driveStatus, mimeTypes }, signal),

    staleTime: 30 * 1000, // 30 seconds cache
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

export const useAllDrivesFilesSync = () => {
  return useQuery({
    queryKey: filesKey.allUserFiles(),
    queryFn: allDrivesFilesSync,
    enabled: false,
  });
};
