import axios from 'axios';
import { API_CONFIG } from '../constants/api';
// import * as SecureStore from 'expo-secure-store'; // Cài đặt expo-secure-store để lưu token an toàn: npx expo install expo-secure-store

const axiosClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor cho Request: Gắn token vào header trước khi gọi API
axiosClient.interceptors.request.use(
  async (config) => {
    // Lấy token từ bộ nhớ (Ví dụ: SecureStore, AsyncStorage)
    // const token = await SecureStore.getItemAsync('userToken');
    // if (token && config.headers) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor cho Response: Xử lý dữ liệu trả về và lỗi chung (như 401 hết hạn token)
axiosClient.interceptors.response.use(
  (response) => {
    // Lấy trực tiếp dữ liệu từ response (bỏ qua config, headers, status)
    return response.data;
  },
  (error) => {
    // Bắt lỗi tập trung
    if (error.response) {
      // Máy chủ trả về lỗi (4xx, 5xx)
      console.error('Lỗi API [Response]:', error.response.status, error.response.data);

      // Nếu là 401 Unauthorized -> Đăng xuất người dùng hoặc gọi API Refresh Token
      if (error.response.status === 401) {
        console.warn('Token hết hạn. Cần đăng nhập lại!');
        // dispatch(logoutAction) ...
      }
    } else if (error.request) {
      // Gọi API nhưng không nhận được phản hồi (rớt mạng, server chết)
      console.error('Lỗi Mạng [Request]: Không nhận được phản hồi', error.message);
    } else {
      // Lỗi nội bộ hoặc cấu hình sai
      console.error('Lỗi Cấu hình:', error.message);
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
