import type { CreateTripRequest, Trip } from '@/lib/types/trip';
import { apiClient } from './client';

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
