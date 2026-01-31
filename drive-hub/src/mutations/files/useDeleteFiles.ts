import { deleteFilesAPI, permanentlyDeleteTrashedFilesAPI } from "@/api/files/files.api";
import { filesKey } from "@/api/files/files.keys";
import { driveKeys } from "@/api/drive/drive.keys";
import { analyticsKeys } from "@/api/analytics/analytics.keys";
import { duplicatesKeys } from "@/api/duplicates/duplicates.keys";
import { apiClient } from "@/api/http/axios.client";
import { deleteFiles } from "@/services/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useDeleteFiles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFilesAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: filesKey.all,
      });
      queryClient.invalidateQueries({
        queryKey: duplicatesKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: driveKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.all,
      });
    },
  });
};

export const usePermanentlyDeleteTrashedFiles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: permanentlyDeleteTrashedFilesAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: filesKey.all,
      });
      queryClient.invalidateQueries({
        queryKey: driveKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.all,
      });
    },
  });
};
