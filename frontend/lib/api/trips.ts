import axios from 'axios';
import type { CreateTripRequest, Trip } from '@/lib/types/trip';
import { createAppError } from '@/lib/types/errors';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // AI generation measures 14-18s for a typical trip; the edit flow issues an
  // update and a generate back to back.
  timeout: 120000,
});

apiClient.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(createAppError(error))
);

export const tripsApi = {
  createTrip: async (data: CreateTripRequest): Promise<Trip> => {
    const response = await apiClient.post<Trip>('/api/v1/trips', data);
    return response.data;
  },

  /**
   * Update an existing trip's inputs in place, without creating a new trip.
   */
  updateTrip: async (tripId: number, data: CreateTripRequest): Promise<Trip> => {
    const response = await apiClient.put<Trip>(`/api/v1/trips/${tripId}`, data);
    return response.data;
  },

  generateRecommendation: async (tripId: number): Promise<Trip> => {
    const response = await apiClient.post<Trip>(`/api/v1/trips/${tripId}/generate`);
    return response.data;
  },

  getTrip: async (tripId: number): Promise<Trip> => {
    const response = await apiClient.get<Trip>(`/api/v1/trips/${tripId}`);
    return response.data;
  },

  listTrips: async (): Promise<Trip[]> => {
    const response = await apiClient.get<Trip[]>('/api/v1/trips');
    return response.data;
  },

  deleteTrip: async (tripId: number): Promise<void> => {
    await apiClient.delete(`/api/v1/trips/${tripId}`);
  },
};
