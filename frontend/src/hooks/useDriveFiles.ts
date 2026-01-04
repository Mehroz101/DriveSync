import { useQuery } from "@tanstack/react-query";
import { fetchDriveFiles } from "../api/drive.api";
import { isAuthenticated } from "../utils/auth";

// No userId parameter needed - uses authenticated user from token
export const useDriveFiles = () => {
  return useQuery({
    queryKey: ["drive-files"],
    queryFn: () => fetchDriveFiles(),
    enabled: isAuthenticated(),
    staleTime: 1000 * 60 * 5,
    retry: 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
};
 