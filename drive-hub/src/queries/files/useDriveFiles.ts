import { allDrivesFiles, allDrivesFilesSync, FilesQuery } from "@/api/files/files.api";
import { filesKey } from "@/api/files/files.keys";
import { useQuery } from "@tanstack/react-query";

export const useAllDrivesFiles = (queryParams: FilesQuery = {}) => {
  return useQuery({
    queryKey: filesKey.list(queryParams), // cache by all params
    queryFn: ({ signal }) => allDrivesFiles(queryParams, signal),
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

export const useTrashedFiles = (queryParams: FilesQuery = {}) => {
  return useQuery({
    queryKey: filesKey.trashed({ ...queryParams, trashed: true }),
    queryFn: ({ signal }) => allDrivesFiles({ ...queryParams, trashed: true }, signal),
    staleTime: 30 * 1000, // 30 seconds cache
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

