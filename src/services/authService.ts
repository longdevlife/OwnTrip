import { ENDPOINTS } from '../constants/api';
import axiosClient from './axiosClient';

export const authService = {
  login: async (email: string, password: string) => {
    return await axiosClient.post(ENDPOINTS.AUTH.LOGIN, { email, password });
  },

  register: async (name: string, email: string, password: string) => {
    return await axiosClient.post(ENDPOINTS.AUTH.REGISTER, { name, email, password });
  },

  googleLogin: async (idToken: string) => {
    return await axiosClient.post(ENDPOINTS.AUTH.GOOGLE_LOGIN, { idToken });
  },

  getProfile: async () => {
    return await axiosClient.get(ENDPOINTS.USERS.PROFILE);
  },

  logout: async () => {
    return await axiosClient.post(ENDPOINTS.AUTH.LOGOUT);
  },
};
