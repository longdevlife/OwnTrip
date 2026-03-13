import { ENDPOINTS } from '../constants/api';
import axiosClient from './axiosClient';

export interface UserLoginData {
  email: string;
  password?: string;
  // Dành cho OAuth
  access_token?: string;
}

export interface UserResponseData {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
}

// Tập hợp các function gọi API liên quan đến Authentication
export const authService = {
  /**
   * Đăng nhập người dùng bằng email / password
   */
  login: async (credentials: UserLoginData): Promise<UserResponseData> => {
    return await axiosClient.post<any, UserResponseData>(ENDPOINTS.AUTH.LOGIN, credentials);
  },

  /**
   * Lấy profile hiện tại của User
   */
  getProfile: async () => {
    return await axiosClient.get(ENDPOINTS.USERS.PROFILE);
  },
};
