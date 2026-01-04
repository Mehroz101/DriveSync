import { getAuthToken } from "../api/auth.api";
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Get userId from JWT token, not from localStorage
export const getUserId = (): string | null => {
  const token = getAuthToken();
  if (!token) return null;
  
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    return decoded.userId;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export const clearUserSession = () => {
  // Only remove token, no userId in localStorage
  localStorage.removeItem("token");
};

export const isAuthenticated = (): boolean => {
  return getAuthToken() !== null;
};


