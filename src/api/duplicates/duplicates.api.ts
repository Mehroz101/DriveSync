import { apiClient } from "../http/axios.client";
import type { DuplicateGroup } from "@/types";

export interface DuplicatesApiResponse {
  data: DuplicateGroup[];
  success: boolean;
  meta?: {
    total: number;
  };
}

export const getDuplicates = async (signal?: AbortSignal): Promise<DuplicateGroup[]> => {
  const response = await apiClient.get<DuplicatesApiResponse>("/duplicates", {
    signal,
    timeout: 15000,
  });

  return response.data.data;
};
