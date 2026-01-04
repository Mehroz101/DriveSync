import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchDriveAccounts, 
  addDriveAccount, 
  removeDriveAccount, 
  syncDriveFiles 
} from "../api/drive.api";
import { isAuthenticated } from "../utils/auth";

// Fetch drive accounts for authenticated user (no userId parameter)
export const useDriveAccounts = () => {
  return useQuery({
    queryKey: ["drive-accounts"],
    queryFn: () => fetchDriveAccounts(),
    enabled: isAuthenticated(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
};

export const useAddDriveAccount = () => {
  return useMutation({
    mutationFn: () => addDriveAccount(),
  });
};

export const useRemoveDriveAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (accountId: string) => removeDriveAccount(accountId),
    onSuccess: () => {
      // Invalidate and refetch drive accounts
      queryClient.invalidateQueries({ queryKey: ["drive-accounts"] });
      // Also refetch files since they may have changed
      queryClient.invalidateQueries({ queryKey: ["drive-files"] });
    },
  });
};

export const useSyncDriveFiles = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => syncDriveFiles(),
    onSuccess: () => {
      // Invalidate and refetch files after sync
      queryClient.invalidateQueries({ queryKey: ["drive-files"] });
      queryClient.invalidateQueries({ queryKey: ["drive-accounts"] });
    },
  });
}; 