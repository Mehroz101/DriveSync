import { useQuery } from "@tanstack/react-query";
import { fetchGoogleUser } from "../api/user.api";
import type { GoogleUser } from "../types/user.types";

export const useGoogleUser = (userId: string) => {
  return useQuery<GoogleUser>({
    queryKey: ["google-user"],
    queryFn: () => fetchGoogleUser(userId),
    staleTime: 1000 * 60 * 5, // cache 5 minutes
    retry: 1,
  });
};
