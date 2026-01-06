import { useQuery } from "@tanstack/react-query";
import { getGoogleDriveAccounts } from "@/api/drive/drive.api";
import { driveKeys } from "@/api/drive/drive.keys";

export const useDriveAccounts = () => {
  return useQuery({
    queryKey: driveKeys.accounts(),
    queryFn: getGoogleDriveAccounts,
  });
};
