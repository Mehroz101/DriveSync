import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addGoogleDriveAccount } from "@/api/drive/drive.api";
import { driveKeys } from "@/api/drive/drive.keys";

export const useAddDrive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addGoogleDriveAccount,
    onSuccess: () => {

      queryClient.invalidateQueries({
        queryKey: driveKeys.accounts(),
      });
     
    },
  });
};
