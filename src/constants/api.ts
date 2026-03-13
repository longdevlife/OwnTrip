export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://owntrip.vercel.app',
  TIMEOUT: 15000,
};

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/users/login',
    REGISTER: '/api/users/register',
    GOOGLE_LOGIN: '/api/users/login/google',
    LOGOUT: '/api/users/logout',
    REFRESH_TOKEN: '/api/users/refresh-token',
  },
  USERS: {
    PROFILE: '/users/me',
    UPDATE: '/users/update',
  },
  TRIPS: {
    LIST: '/trips',
    DETAIL: (id: string) => `/trips/${id}`,
    CREATE: '/trips',
    UPDATE: (id: string) => `/trips/${id}`,
    DELETE: (id: string) => `/trips/${id}`,
  },
};
