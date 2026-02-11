import { useQuery } from "@tanstack/react-query";
import {
  getStorageAnalytics,
  getFileTypeDistribution,
  getDriveUsageStats,
  getDashboardStats,
  getAnalyticsFiles,
  getDriveAccounts
} from "@/api/analytics/analytics.api";
import { analyticsKeys } from "@/api/analytics/analytics.keys";

export const useStorageAnalytics = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: analyticsKeys.storage(startDate, endDate),
    queryFn: () => getStorageAnalytics(startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

export const useFileTypeDistribution = () => {
  return useQuery({
    queryKey: analyticsKeys.fileTypes(),
    queryFn: getFileTypeDistribution,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

export const useDriveUsageStats = () => {
  return useQuery({
    queryKey: analyticsKeys.driveUsage(),
    queryFn: getDriveUsageStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: analyticsKeys.dashboard(),
    queryFn: getDashboardStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

export const useAnalyticsFiles = () => {
  return useQuery({
    queryKey: analyticsKeys.files(),
    queryFn: getAnalyticsFiles,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

export const useDriveAccounts = () => {
  return useQuery({
    queryKey: analyticsKeys.driveAccounts(),
    queryFn: getDriveAccounts,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};


