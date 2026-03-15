import axios from 'axios';

// MockAPI URL
const MOCK_API_URL = 'https://6877a0dedba809d901f03ef1.mockapi.io/SE183675';

export interface Accommodation {
  id: string;
  name: string;
  description: string;
  address: string;
  country: string;
  rating: number;
  reviewsCount: number;
  pricePerNight: number;
  currency: number;
  images: string;
  latitude: string;
  longitude: string;
  isAvailable: boolean;
  amenities: string[];
}

export const accommodationService = {
  /**
   * Lấy danh sách tất cả accommodations từ MockAPI
   */
  getAll: async (): Promise<Accommodation[]> => {
    try {
      const response = await axios.get<Accommodation[]>(MOCK_API_URL);
      return response.data ?? [];
    } catch (error) {
      console.error('Error fetching accommodations:', error);
      return [];
    }
  },

  /**
   * Lấy accommodation by ID
   */
  getById: async (id: string): Promise<Accommodation | null> => {
    try {
      const response = await axios.get<Accommodation>(
        `${MOCK_API_URL}/${id}`
      );
      return response.data ?? null;
    } catch (error) {
      console.error(`Error fetching accommodation ${id}:`, error);
      return null;
    }
  },
};
