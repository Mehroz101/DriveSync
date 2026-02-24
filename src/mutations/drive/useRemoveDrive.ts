import { useMutation, useQueryClient } from "@tanstack/react-query";
import { removeDriveAccount } from "@/api/drive/drive.api";
import { driveKeys } from "@/api/drive/drive.keys";

export const useRemoveDrive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeDriveAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: driveKeys.accounts(),
      });
    },
  });
};
