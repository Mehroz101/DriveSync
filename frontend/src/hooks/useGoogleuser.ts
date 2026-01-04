import { useQuery } from "@tanstack/react-query";
import { fetchGoogleUser } from "../api/user.api";
import type { GoogleUser } from "../types/user.types";
import { isAuthenticated } from "../utils/auth";

// Fetch Google user for authenticated user (no userId parameter)
export const useGoogleUser = () => {
  console.log("=============useGoogleUser=============");
  return useQuery<GoogleUser>({
    queryKey: ["google-user"],
    queryFn: () => fetchGoogleUser(),
    enabled: isAuthenticated(),
    staleTime: 1000 * 60 * 5, // cache 5 minutes
    retry: 1,
  });
};

export const useGoogleLogin = () => {
  const initiateGoogleLogin = () => {
    window.location.href = "http://localhost:4000/auth/google";
  };
  
  return { initiateGoogleLogin };
};

