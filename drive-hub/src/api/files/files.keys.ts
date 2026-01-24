import { QUERY_SCOPE } from "@/constants/queryScopes";

export const filesKey = {

  // Root scope (tenant isolation)
  all: [QUERY_SCOPE.FILES] as const,

  // All file related queries
  filesRoot: () => [...filesKey.all, "files"] as const,

  // Files by drive account
  byDrive: (driveAccountId: string) =>
    [...filesKey.filesRoot(), "drive", driveAccountId] as const,

  // Files by user across all drives (main dashboard view)
  allUserFiles: () =>
    [...filesKey.filesRoot(), "all"] as const,

  // Paginated + Filtered listing (primary UI)
  list: (params: {
    page?: number;
    limit?: number;
    search?: string;
    driveId?: string;
    driveStatus?: string;
    mimeTypes?: string[];
  }) =>
    [...filesKey.filesRoot(), "list", params] as const,

  // Single file details
  detail: (fileId: string) =>
    [...filesKey.filesRoot(), "detail", fileId] as const,

  // Search only queries
  search: (term: string) =>
    [...filesKey.filesRoot(), "search", term] as const,

  // Background sync invalidation key
  sync: () =>
    [...filesKey.filesRoot(), "sync"] as const,
};
