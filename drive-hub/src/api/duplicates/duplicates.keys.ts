export const duplicatesKeys = {
  all: () => ["duplicates"] as const,
  lists: () => [...duplicatesKeys.all(), "list"] as const,
  list: (filters?: any) => [...duplicatesKeys.lists(), filters] as const,
};
