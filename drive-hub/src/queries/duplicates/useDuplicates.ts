import { getDuplicates } from "@/api/duplicates/duplicates.api";
import { duplicatesKeys } from "@/api/duplicates/duplicates.keys";
import { useQuery } from "@tanstack/react-query";

export const useDuplicates = () => {
  return useQuery({
    queryKey: duplicatesKeys.list(),
    queryFn: ({ signal }) => getDuplicates(signal),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};
