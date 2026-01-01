import { useQuery } from "@tanstack/react-query";
import { fetchDriveFiles } from "../api/drive.api";

export const useDriveFiles = (userId: string | null) => {
  return useQuery({
    queryKey: ["drive-files", userId],
    queryFn: () => fetchDriveFiles(userId as string),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5,
    retry: 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
};
