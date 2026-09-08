import api from './client';

export interface SignupData {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export const authApi = {
  signup: (data: SignupData) => api.post<TokenResponse>('/auth/signup', data),
  login: (data: LoginData) => api.post<TokenResponse>('/auth/login', data),
  refresh: () => api.post<TokenResponse>('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get<User>('/auth/me'),
};
