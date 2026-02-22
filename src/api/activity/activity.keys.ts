import { QUERY_SCOPE } from "@/constants/queryScopes";

export interface ActivityLogsQuery {
  page?: number;
  limit?: number;
  actionType?: string;
  targetType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const activityKeys = {
  all: [QUERY_SCOPE.ACTIVITY] as const,

  logs: () => [...activityKeys.all, "logs"] as const,
  logsList: (params: ActivityLogsQuery) =>
    [...activityKeys.logs(), "list", params] as const,

  aggregations: () => [...activityKeys.all, "aggregations"] as const,
  aggregationsFiltered: (dateFrom?: string, dateTo?: string) =>
    [...activityKeys.aggregations(), { dateFrom, dateTo }] as const,

  recent: (limit?: number) => [...activityKeys.all, "recent", limit] as const,
};
