// src/api/authService.ts
import { identityService } from "./apiClient";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string;
  is_active: boolean;
  is_staff: boolean;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: UserResponse;
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await identityService.post(
      "/api/identity/token/",
      credentials
    );
    return response.data;
  },

  register: async (userData: any) => {
    const response = await identityService.post(
      "/api/identity/register/",
      userData
    );
    return response.data;
  },

  getCurrentUser: async (): Promise<UserResponse> => {
    const response = await identityService.get("/api/identity/users/me/");
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  },
};
