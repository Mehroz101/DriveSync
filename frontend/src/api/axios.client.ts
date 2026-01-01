import axios from "axios";

export const apiClient = axios.create({
  baseURL: "http://localhost:4000",
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response:any) => response,
  (error:any) => {
    return Promise.reject(error);
  }
);
