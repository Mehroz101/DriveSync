import { getAuthToken } from "../api/auth.api";

export const getUserId = (): string | null => {
  return localStorage.getItem("userId");
};

export const clearUserSession = () => {
  localStorage.removeItem("userId");
  localStorage.removeItem("token");
};

export const isAuthenticated = (): boolean => {
  // Check both Google OAuth and JWT authentication
  return getUserId() !== null || getAuthToken() !== null;
};