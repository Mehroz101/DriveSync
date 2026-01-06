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
      setUser(response.data);
    } catch (error) {
      console.error("Failed to check auth status:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log("login: ",email, password)
      const response = await apiClient.post("/email-auth/login", {
        email,
        password,
      });
      console.log(response.data)
      if (response.status === 200) {
        setUser(response.data);
      }
    } catch (error) {
      console.error("Login failed:", error);
      throw new Error(error);
    }
    // Simulate API call
    // await new Promise(resolve => setTimeout(resolve, 1000));

    // // For demo purposes, we'll use the mock user if credentials match
    // if (email === 'test@gmail.com' && password === '12345678') {
    //   const response = await getCurrentUser();
    //   if (response.success) {
    //     setUser(response.data);
    //     localStorage.setItem('authToken', 'demo-token');
    //   }
    // } else {
    //   throw new Error('Invalid credentials');
    // }
  };

  const signup = async (name: string, email: string, password: string) => {
    // Simulate API call
    try {
      const response = await apiClient.post("/email-auth/signup", {
        name,
        email,
        password,
      });
      if (response.status === 200) {
        setUser(response.data);
      }
    } catch (error) {
      console.error("Signup failed:", error);
      throw new Error(error);
    }
  };

  const loginWithGoogle = async () => {
    // Simulate Google login
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const response = await getCurrentUser();
    if (response.success) {
      setUser(response.data);
      localStorage.setItem("authToken", "demo-token");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("authToken");
  };

  const value = {
    user,
    loading,
    login,
    signup,
    loginWithGoogle,
    logout,
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
