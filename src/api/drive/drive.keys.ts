import { QUERY_SCOPE } from "@/constants/queryScopes";

export const driveKeys = {
  all: [QUERY_SCOPE.DRIVE] as const,

  accounts: () => [...driveKeys.all, "accounts"] as const,

  account: (accountId: string) =>
    [...driveKeys.accounts(), accountId] as const,

  quota: (accountId: string) =>
    [...driveKeys.account(accountId), "quota"] as const,

  files: (accountId: string, filters?: string) =>
    [...driveKeys.account(accountId), "files", filters] as const,
};
