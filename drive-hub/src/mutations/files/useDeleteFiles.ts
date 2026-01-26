import { deleteFilesAPI } from "@/api/files/files.api";
import { filesKey } from "@/api/files/files.keys";
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
    },
  });
};
