import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reconnectGoogleDriveAccount } from "@/api/drive/drive.api";
import { driveKeys } from "@/api/drive/drive.keys";

export const useReconnectDrive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reconnectGoogleDriveAccount,
    onSuccess: () => {

      queryClient.invalidateQueries({
        queryKey: driveKeys.accounts(),
      });
     
    },
  });
};
