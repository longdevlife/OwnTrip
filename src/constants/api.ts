export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://owntrip.vercel.app',
  TIMEOUT: 15000,
};

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    GOOGLE_LOGIN: '/auth/google',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh',
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
