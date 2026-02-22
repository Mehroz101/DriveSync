import { useQuery } from "@tanstack/react-query";
import {
  fetchActivityLogs,
  fetchActivityAggregations,
  fetchRecentActivity,
} from "@/api/activity/activity.api";
import { activityKeys, type ActivityLogsQuery } from "@/api/activity/activity.keys";

export const useActivityLogs = (query: ActivityLogsQuery = {}) => {
  return useQuery({
    queryKey: activityKeys.logsList(query),
    queryFn: ({ signal }) => fetchActivityLogs(query, signal),
    staleTime: 0,
    gcTime: 0,
    retry: 2,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useActivityAggregations = (dateFrom?: string, dateTo?: string) => {
  return useQuery({
    queryKey: activityKeys.aggregationsFiltered(dateFrom, dateTo),
    queryFn: ({ signal }) => fetchActivityAggregations(dateFrom, dateTo, signal),
    staleTime: 0,
    gcTime: 0,
    retry: 2,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useRecentActivity = (limit = 10) => {
  return useQuery({
    queryKey: activityKeys.recent(limit),
    queryFn: ({ signal }) => fetchRecentActivity(limit, signal),
    staleTime: 0,
    gcTime: 0,
    retry: 2,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};
