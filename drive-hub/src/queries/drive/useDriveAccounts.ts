import { useQuery } from "@tanstack/react-query";
import {
  getAccountRefetchById,
  getAccountsRefetch,
  getAllDriveStats,
  getGoogleDriveAccounts,
} from "@/api/drive/drive.api";
import { driveKeys } from "@/api/drive/drive.keys";
import type { DriveStatsResponse } from "@/types";

export const useDriveAccounts = () => {
  return useQuery({
    queryKey: driveKeys.accounts(),
    queryFn: getGoogleDriveAccounts,
  });
};
export const useDriveAccountsRefetch = () => {
  return useQuery({
    queryKey: driveKeys.accounts(),
    queryFn: getAccountsRefetch,
    enabled: false,
  });
};
export const useAccountRefetchById = (driveId: string) => {
  return useQuery({
    queryKey: driveKeys.account(driveId),
    queryFn: () => getAccountRefetchById(driveId),
    enabled: !!driveId,
  });
};
export const useDriveAccountStats = () => {
  return useQuery<DriveStatsResponse>({
    queryKey: driveKeys.accounts(),
    queryFn: () => getAllDriveStats(),
  });
};
