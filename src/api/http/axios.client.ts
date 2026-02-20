import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { toast } from "@/components/ui/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

// Interface for structured API errors
interface ApiError {
  code: string;
  message: string;
  details?: Array<{ field?: string; message: string }>;
  timestamp?: string;
  requestId?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    hasMore?: boolean;
  };
}

// Extend AxiosRequestConfig to include metadata
interface RequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    startTime: number;
  };
}

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  timeout: 30000, // 30 second timeout
  withCredentials: true, // For session cookies
});

// Request interceptor - Add authentication token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request timestamp for debugging
    const extendedConfig = config as RequestConfig;
    extendedConfig.metadata = { startTime: Date.now() };
    
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle responses and errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response time in development
    if (import.meta.env.DEV) {
      const extendedConfig = response.config as RequestConfig;
      const duration = Date.now() - (extendedConfig.metadata?.startTime || 0);
      console.log(`API ${response.config.method?.toUpperCase()} ${response.config.url}: ${duration}ms`);
    }

    // Handle login/signup token storage
    if (
      response.config.url?.includes("/email-auth/login") ||
      response.config.url?.includes("/email-auth/signup") ||
      response.config.url?.includes("/auth/google/callback")
    ) {
      const token = response.data?.token || response.data?.data?.token;
      if (token) {
        localStorage.setItem("token", token);
      }
    }

    return response;
  },
  (error: AxiosError) => {
    // Handle different types of errors
    if (error.response) {
      // Server responded with error status
      const statusCode = error.response.status;
      const errorData = error.response.data as Record<string, unknown>;

      // Handle structured API errors
      if (errorData?.error) {
        const apiError: ApiError = errorData.error as ApiError;
        
        switch (statusCode) {
          case 401:
            // Unauthorized - clear token and redirect to login
            handleUnauthorized(apiError);
            break;
          case 403:
            // Forbidden
            showErrorToast("Access Denied", apiError.message);
            break;
          case 422:
          case 400:
            // Validation errors - handled by forms
            break;
          case 429:
            // Rate limited
            showErrorToast("Too Many Requests", "Please slow down and try again later");
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            // Server errors
            showErrorToast("Server Error", "Something went wrong on our end. Please try again");
            break;
          default:
            showErrorToast("Request Failed", apiError.message || "An unexpected error occurred");
        }

        return Promise.reject({
          ...apiError,
          status: statusCode,
        });
      }

      // Handle non-structured errors
      return Promise.reject({
        code: 'HTTP_ERROR',
        message: (errorData?.message as string) || `HTTP ${statusCode} Error`,
        status: statusCode,
      });
    } else if (error.request) {
      // Network error
      console.error("Network error:", error.message);
      showErrorToast("Network Error", "Please check your internet connection");
      
      return Promise.reject({
        code: 'NETWORK_ERROR',
        message: "Network connection failed",
        originalError: error.message,
      });
    } else {
      // Request configuration error
      console.error("Request setup error:", error.message);
      
      return Promise.reject({
        code: 'REQUEST_ERROR',
        message: "Request configuration error",
        originalError: error.message,
      });
    }
  }
);

// Helper function to handle unauthorized errors
function handleUnauthorized(error: ApiError) {
  // Clear authentication data
  localStorage.removeItem("token");
  
  // Show appropriate message
  if (error.code === "TOKEN_EXPIRED") {
    showErrorToast("Session Expired", "Please log in again");
  } else {
    showErrorToast("Authentication Required", "Please log in to continue");
  }
  
  // Redirect to login after a short delay
  setTimeout(() => {
    window.location.href = "/login";
  }, 2000);
}

// Helper function to show error toasts
function showErrorToast(title: string, description: string) {
  toast({
    variant: "destructive",
    title,
    description,
  });
}

// Typed API client methods
export const api = {
  // Generic GET request
  get: <T = unknown>(url: string, params?: Record<string, unknown>): Promise<T> => {
    return apiClient.get<ApiResponse<T>>(url, { params }).then(res => (res.data.data || res.data) as T);
  },

  // Generic POST request
  post: <T = unknown>(url: string, data?: Record<string, unknown>): Promise<T> => {
    return apiClient.post<ApiResponse<T>>(url, data).then(res => (res.data.data || res.data) as T);
  },

  // Generic PUT request
  put: <T = unknown>(url: string, data?: Record<string, unknown>): Promise<T> => {
    return apiClient.put<ApiResponse<T>>(url, data).then(res => (res.data.data || res.data) as T);
  },

  // Generic DELETE request
  delete: <T = unknown>(url: string): Promise<T> => {
    return apiClient.delete<ApiResponse<T>>(url).then(res => (res.data.data || res.data) as T);
  },

  // File upload with progress
  upload: <T = unknown>(
    url: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<T> => {
    const formData = new FormData();
    formData.append("file", file);

    return apiClient.post<ApiResponse<T>>(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    }).then(res => (res.data.data || res.data) as T);
  },
};

// Export both for compatibility
export default apiClient;
