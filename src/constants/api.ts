// URL cấu hình API, dùng biến môi trường để bảo mật và dễ thay đổi theo môi trường dev/prod
export const API_CONFIG = {
  // Team có thể tạo file .env và thêm EXPO_PUBLIC_API_URL=https://api.tuicua-team.com
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.example.com/api/v1',
  TIMEOUT: 15000, // Timeout mặc định là 15 giây
};

// Quản lý định tuyến API tĩnh để dễ tìm và tái sử dụng
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH_TOKEN: '/auth/refresh',
  },
  USERS: {
    PROFILE: '/users/me',
    UPDATE: '/users/update',
  },
  TRIPS: {
    LIST: '/trips',
    DETAIL: (id: string) => `/trips/${id}`,
  },
};
