import { apiClient } from "../http/axios.client";
import type { DriveFile } from "@/types";

export interface SearchResponse {
  results: DriveFile[];
  total: number;
  query: string;
}

export const searchFiles = async (query: string): Promise<SearchResponse> => {
  try {
    const response = await apiClient.get("/search", {
      params: { query },
    });
    const data = response.data.data || response.data;
    const meta = response.data.meta || {};
    return {
      results: Array.isArray(data) ? data : [],
      total: meta.total ?? (Array.isArray(data) ? data.length : 0),
      query: meta.query ?? query,
    };
  } catch (error) {
    console.error("Failed to search files:", error);
    throw error;
  }
};
