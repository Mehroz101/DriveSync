import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addGoogleDriveAccount } from "@/api/drive/drive.api";
import { driveKeys } from "@/api/drive/drive.keys";
import { dashboardKeys } from "@/api/dashboard/dashboard.keys";

export const useAddDrive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addGoogleDriveAccount,
    onSuccess: () => {

      queryClient.invalidateQueries({
        queryKey: driveKeys.accounts(),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.states(),
      });
    },
  });
};
