import axios from "axios";
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

// Create axios instance for auth requests
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    //if it is login or signup add token
    if (
      response.config.url === "/email-auth/login" ||
      response.config.url === "/email-auth/signup"
    ) {
      localStorage.setItem("token", response?.data?.token);
    }
    return response;
   
  },
  (error) => {
    return Promise.reject(error.response.data.error);
  }
);
