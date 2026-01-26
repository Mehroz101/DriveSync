import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addGoogleDriveAccount } from "@/api/drive/drive.api";
import { driveKeys } from "@/api/drive/drive.keys";
import { allDrivesFilesSync } from "@/api/files/files.api";
import { filesKey } from "@/api/files/files.keys";

export const useDriveFilesSync = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: allDrivesFilesSync,
    onSuccess: () => {

      queryClient.invalidateQueries({
        queryKey: filesKey.allUserFiles(),
      });
    },
  });
};
