import { useQuery } from "@tanstack/react-query";
import { searchDriveFiles } from "../api/drive.api";

export const useSearch = (userId: string | null, query: string) => {
  return useQuery({
    queryKey: ["search-results", userId, query],
    queryFn: () => searchDriveFiles(userId as string, query),
    enabled: Boolean(userId) && query.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};