import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User } from "@/types";
import { getCurrentUser } from "@/services/api";
import { apiClient } from "@/api/http/axios.client";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  checkAuthStatus: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on app load
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      checkAuthStatus();
    } else {
      setLoading(false);
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await apiClient.get("/profile");
      // Extract data from standardized response: { success: true, data: User }
      setUser(response.data.data || response.data);
    } catch (error) {
      console.error("Failed to check auth status:", error);
      // Clear invalid token
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post("/email-auth/login", {
        email,
        password,
      });
      if (response.status === 200) {
        // Extract data from standardized response: { success: true, data: User }
        setUser(response.data.data || response.data);
        // Fetch full profile to ensure all user data is loaded
        await checkAuthStatus();
      }
    } catch (error: unknown) {
      console.error("Login failed:", error);
      
      // Extract proper error message
      let errorMessage = 'Login failed. Please try again.';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; error?: string; success?: boolean } } };
        // Backend returns errors in format: {"success": false, "error": "message"}
        if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      const response = await apiClient.post("/email-auth/signup", {
        name,
        email,
        password,
      });
      if (response.status === 200) {
        // Extract data from standardized response: { success: true, data: User }
        setUser(response.data.data || response.data);
        // Fetch full profile to ensure all user data is loaded
        await checkAuthStatus();
      }
    } catch (error: unknown) {
      console.error("Signup failed:", error);
      
      // Extract proper error message
      let errorMessage = 'Signup failed. Please try again.';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; error?: string; success?: boolean } } };
        // Backend returns errors in format: {"success": false, "error": "message"}
        if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  };

  const loginWithGoogle = async () => {
    // Redirect to backend Google OAuth flow
    const apiBaseUrl =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
    window.location.href = `${apiBaseUrl}/auth/google`;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
  };

  const value = {
    user,
    loading,
    login,
    signup,
    loginWithGoogle,
    logout,
    checkAuthStatus,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
