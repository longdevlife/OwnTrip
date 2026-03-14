import axiosClient from './axiosClient';
import { ENDPOINTS } from '../constants/api';

export interface Trip {
  _id: string;
  userId: string;
  title: string;
  destination: string;
  province: string;
  provinceImage?: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  description?: string;
  isPublished: boolean;
  budget?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TripDay {
  day: number;
  date: string;
  places: any[]; // Bạn có thể định nghĩa type Place chi tiết sau nếu cần
}

export interface TripsResponse {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  trips: Trip[];
}

export interface TripDetailResponse {
  success: boolean;
  trip: Trip;
  days: TripDay[];
}

export interface DestinationPlace {
  _id: string;
  dayId: string;
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  photo?: string;
  mapUrl?: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Destination {
  dayId: string;
  day: number;
  date: string;
  place: DestinationPlace;
}

export interface DestinationsResponse {
  success: boolean;
  trip: { _id: string; title: string; destination: string };
  totalDestinations: number;
  destinations: Destination[];
}

export const tripService = {
  getPublishedTrips: async (page: number = 1, limit: number = 20): Promise<Trip[]> => {
    try {
      const url = `${ENDPOINTS.TRIPS.PUBLISHED}?page=${page}&limit=${limit}`;
      const response = await axiosClient.get<any, TripsResponse>(url);
      
      return response?.trips ?? [];
    } catch (error) {
      console.error('Error fetching published trips:', error);
      return [];
    }
  },

  getTripById: async (id: string): Promise<TripDetailResponse | null> => {
    try {
      const url = ENDPOINTS.TRIPS.DETAIL(id);
      const response = await axiosClient.get<any, TripDetailResponse>(url);
      return response;
    } catch (error) {
      console.error(`Error fetching trip ${id}:`, error);
      return null;
    }
  },
  
  createTrip: async (tripData: any) => {
    try {
      const response = await axiosClient.post(ENDPOINTS.TRIPS.CREATE, tripData);
      return response;
    } catch (error) {
      console.error('Error creating trip:', error);
      throw error;
    }
  },

  getMyTrips: async (): Promise<Trip[]> => {
    try {
      const response = await axiosClient.get<any, TripsResponse>(ENDPOINTS.TRIPS.MY_TRIPS);
      return response?.trips ?? [];
    } catch (error) {
      console.error('Error fetching my trips:', error);
      return [];
    }
  },

  getDestinations: async (tripId: string): Promise<Destination[]> => {
    try {
      const url = ENDPOINTS.TRIPS.DESTINATIONS(tripId);
      const response = await axiosClient.get<any, DestinationsResponse>(url);
      return response?.destinations ?? [];
    } catch (error) {
      console.error(`Error fetching destinations for trip ${tripId}:`, error);
      return [];
    }
  },
};
