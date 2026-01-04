import { useQuery } from "@tanstack/react-query";
import { searchDriveFiles } from "../api/drive.api";
import { isAuthenticated } from "../utils/auth";

// Search files for authenticated user (no userId parameter)
export const useSearch = (query: string) => {
  return useQuery({
    queryKey: ["search-results", query],
    queryFn: () => searchDriveFiles(query),
    enabled: isAuthenticated() && query.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}; 