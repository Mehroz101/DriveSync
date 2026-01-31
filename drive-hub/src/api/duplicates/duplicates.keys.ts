export const duplicatesKeys = {
  all:  ["duplicates"] as const,
  lists: () => [...duplicatesKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) => [...duplicatesKeys.lists(), filters] as const,
};

