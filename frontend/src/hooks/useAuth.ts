import { useMutation } from '@tanstack/react-query';
import { register as registerAPI, login as loginAPI, logout as logoutAPI } from '../api/auth.api';

export const useRegister = () => {
  return useMutation({
    mutationFn: registerAPI,
  });
};

export const useLogin = () => {
  return useMutation({
    mutationFn: loginAPI,
  });
};

export const useLogout = () => {
  return useMutation({
    mutationFn: logoutAPI,
  });
};