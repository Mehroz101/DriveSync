import { apiClient } from "../http/axios.client";
import type { ActivityLog, ActivityLogAggregations } from "@/types";
import type { ActivityLogsQuery } from "./activity.keys";

export interface ActivityLogsResponse {
  success: boolean;
  data: ActivityLog[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ActivityAggregationsResponse {
  success: boolean;
  data: ActivityLogAggregations;
}

export interface RecentActivityResponse {
  success: boolean;
  data: ActivityLog[];
}

/**
 * Fetch paginated + filtered activity logs
 */
export const fetchActivityLogs = async (
  query: ActivityLogsQuery = {},
  signal?: AbortSignal
): Promise<ActivityLogsResponse> => {
  const params = new URLSearchParams();

  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.actionType) params.set("actionType", query.actionType);
  if (query.targetType) params.set("targetType", query.targetType);
  if (query.status) params.set("status", query.status);
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  if (query.search) params.set("search", query.search);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortOrder) params.set("sortOrder", query.sortOrder);

  const response = await apiClient.get(`/activity-logs?${params.toString()}`, { signal });
  return response.data;
};

/**
 * Fetch aggregated analytics
 */
export const fetchActivityAggregations = async (
  dateFrom?: string,
  dateTo?: string,
  signal?: AbortSignal
): Promise<ActivityAggregationsResponse> => {
  const params = new URLSearchParams();
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);

  const response = await apiClient.get(`/activity-logs/aggregations?${params.toString()}`, { signal });
  return response.data;
};

/**
 * Fetch recent activity for dashboard widget
 */
export const fetchRecentActivity = async (
  limit = 10,
  signal?: AbortSignal
): Promise<RecentActivityResponse> => {
  const response = await apiClient.get(`/activity-logs/recent?limit=${limit}`, { signal });
  return response.data;
};
