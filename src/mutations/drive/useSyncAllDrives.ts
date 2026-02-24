import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAccountsRefetch } from "@/api/drive/drive.api";
import { driveKeys } from "@/api/drive/drive.keys";

export const useSyncAllDrives = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: getAccountsRefetch,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: driveKeys.accounts(),
      });
    },
  });
};
