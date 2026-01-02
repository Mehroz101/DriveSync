import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchDriveAccounts, 
  addDriveAccount, 
  removeDriveAccount, 
  syncDriveFiles 
} from "../api/drive.api";

export const useDriveAccounts = (userId: string | null) => {
  return useQuery({
    queryKey: ["drive-accounts", userId],
    queryFn: () => fetchDriveAccounts(userId as string),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
};

export const useAddDriveAccount = () => {
  return useMutation({
    mutationFn: ({ userId }: { userId: string }) => addDriveAccount(userId),
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
    mutationFn: ({ userId }: { userId: string }) => syncDriveFiles(userId),
    onSuccess: () => {
      // Invalidate and refetch files after sync
      queryClient.invalidateQueries({ queryKey: ["drive-files"] });
      queryClient.invalidateQueries({ queryKey: ["drive-accounts"] });
    },
  });
};