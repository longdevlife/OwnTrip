import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';

export interface UserProfile {
  _id?: string; // ID từ database
  userId: string;
  email: string;
  displayName: string;
  image?: string;
  balance: number;
  points: number;
  role: 'user' | 'admin';
  isVerified: boolean;
  createdAt?: string;
}

export const userService = {
  getMyProfile: async (userId?: string): Promise<UserProfile | null> => {
    try {
      const baseUrl = userId ? ENDPOINTS.USERS.MY_PROFILE(userId) : ENDPOINTS.USERS.PROFILE;
      // Thêm nocache để ép server trả về dữ liệu mới nhất từ DB
      const url = `${baseUrl}?nocache=${Date.now()}`;
      
      const response = await axiosClient.get<any, any>(url);
      const data = response.data || response.user || response;
      if (!data) return null;

      return {
        _id: data._id,
        userId: data.userId || data._id || userId || '',
        email: data.email || '',
        displayName: data.displayName || data.name || 'User',
        image: data.image || '',
        balance: data.balance ?? 0,
        points: data.points ?? 0,
        role: data.role || 'user',
        isVerified: data.isVerified ?? false,
        createdAt: data.createdAt,
      };
    } catch (error) {
      return null;
    }
  },

  updateProfile: async (userId: string, data: Partial<UserProfile>): Promise<boolean> => {
    const url = ENDPOINTS.USERS.UPDATE_PROFILE(userId);
    try {
      // Đảm bảo Payload sạch tuyệt đối như Postman
      // Thêm t= vào link ảnh để ép Server nhận diện có sự thay đổi dữ liệu
      const freshImage = data.image ? `${data.image}${data.image.includes('?') ? '&' : '?'}v=${Date.now()}` : data.image;
      
      const payload = {
        displayName: data.displayName,
        image: freshImage
      };
      
      console.log('📡 [PUT] Sending strictly:', url, JSON.stringify(payload));
      const response: any = await axiosClient.put(url, payload);
      
      // Nếu server trả về success: true hoặc status success
      return response?.success === true || response?.status === 'success' || !!response;
    } catch (error: any) {
      console.error('❌ Update Error:', error?.response?.status, error?.response?.data);
      return false;
    }
  }
};
