// filepath: /Users/macintosh/Documents/GitHub/DriveSync/drive-hub/src/api/analytics/analytics.keys.ts
import { QUERY_SCOPE } from "@/constants/queryScopes";

export const analyticsKeys = {
  all: [QUERY_SCOPE.ANALYTICS] as const,

  storage: (startDate?: string, endDate?: string) =>
    [...analyticsKeys.all, "storage", startDate, endDate] as const,

  fileTypes: () => [...analyticsKeys.all, "file-types"] as const,

  driveUsage: () => [...analyticsKeys.all, "drive-usage"] as const,

  dashboard: () => [...analyticsKeys.all, "dashboard"] as const,

  files: () => [...analyticsKeys.all, "files"] as const,

  driveAccounts: () => [...analyticsKeys.all, "drive-accounts"] as const,
};