import { transferFileAPI, transferBulkFilesAPI } from "@/api/files/files.api";
import type { TransferFileRequest } from "@/api/files/files.api";
import { filesKey } from "@/api/files/files.keys";
import { driveKeys } from "@/api/drive/drive.keys";
import { analyticsKeys } from "@/api/analytics/analytics.keys";
import { duplicatesKeys } from "@/api/duplicates/duplicates.keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Transfer a single file between drives.
 * Invalidates files, drives, analytics and duplicates caches on success.
 */
export const useTransferFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TransferFileRequest) => transferFileAPI(data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: filesKey.all });
        queryClient.invalidateQueries({ queryKey: driveKeys.all });
        queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
        queryClient.invalidateQueries({ queryKey: duplicatesKeys.all });
      }
    },
  });
};

/**
 * Bulk transfer multiple files between drives.
 * Invalidates all relevant caches on completion.
 */
export const useTransferFiles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transfers: TransferFileRequest[]) =>
      transferBulkFilesAPI(transfers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesKey.all });
      queryClient.invalidateQueries({ queryKey: driveKeys.all });
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      queryClient.invalidateQueries({ queryKey: duplicatesKeys.all });
    },
  });
};
