import axios from 'axios';
import { API_CONFIG } from '../constants/api';

const axiosClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Tự gắn token vào header
axiosClient.interceptors.request.use(
  async (config) => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const token = await AsyncStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Tự lấy .data, bắt lỗi chung
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      console.error(`API Error [${status}]:`, data);

      if (status === 401) {
        console.warn('Token hết hạn!');
        // TODO: Redirect về login hoặc refresh token
      }
    } else if (error.request) {
      console.error('Lỗi mạng: Không nhận được phản hồi từ server');
    } else {
      console.error('Lỗi cấu hình:', error.message);
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
