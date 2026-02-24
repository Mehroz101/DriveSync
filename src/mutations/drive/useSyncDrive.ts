import { useMutation, useQueryClient } from "@tanstack/react-query";
import { syncSingleDrive } from "@/api/drive/drive.api";
import { driveKeys } from "@/api/drive/drive.keys";

export const useSyncDrive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncSingleDrive,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: driveKeys.accounts(),
      });
    },
  });
};
