import axios from 'axios';
import type { User } from '../types/user.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

// Create axios instance for auth requests
const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RegisterData {
  email: string;
  password: string;
  name: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await authApi.post<AuthResponse>('/auth/register', data);
  return response.data;
};

export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await authApi.post<AuthResponse>('/auth/login', data);
  return response.data;
};

export const getProfile = async (userId: string): Promise<{ user: User }> => {
  const response = await authApi.get<{ user: User }>(`/auth/profile/${userId}`);
  return response.data;
};

export const logout = async (): Promise<{ message: string }> => {
  const response = await authApi.post<{ message: string }>('/auth/logout');
  return response.data;
};

// Function to save token to localStorage
export const setAuthToken = (token: string) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

// Function to get token from localStorage
export const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

// Function to remove token from localStorage
export const removeAuthToken = () => {
  localStorage.removeItem('token');
};