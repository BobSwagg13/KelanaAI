import { apiClient } from './client';
import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from '@/lib/types/auth';

export const authApi = {
  /**
   * Create an account. Deliberately returns no token — the client sends the
   * user to /login afterwards.
   */
  register: async (data: RegisterRequest): Promise<AuthUser> => {
    const response = await apiClient.post<AuthUser>('/api/v1/auth/register', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', data);
    return response.data;
  },

  /** Current user plus profile stats. Also used to restore a session on load. */
  me: async (): Promise<AuthUser> => {
    const response = await apiClient.get<AuthUser>('/api/v1/auth/me');
    return response.data;
  },
};
