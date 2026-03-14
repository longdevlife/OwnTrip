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
    PROFILE: '/api/users/me',
    UPDATE: '/api/users/update',
    MY_PROFILE: (id: string) => `/api/users/myProfile/${id}`,
    UPDATE_PROFILE: (id: string) => `/api/users/updateProfile/${id}`,
  },
  TRIPS: {
    LIST: '/api/trips',
    PUBLISHED: '/api/trips/published',
    MY_TRIPS: '/api/trips/my',
    DETAIL: (id: string) => `/api/trips/${id}`,
    CREATE: '/api/trips',
    UPDATE: (id: string) => `/api/trips/${id}`,
    DELETE: (id: string) => `/api/trips/${id}`,
    DESTINATIONS: (id: string) => `/api/trips/${id}/destinations`,
  },
  PLACES: {
    SEARCH: '/api/places/search',
    NEARBY: '/api/places/nearby',
    TEXT_SEARCH: '/api/places/text',
    PHOTO: '/api/places/photo',
  },
};
