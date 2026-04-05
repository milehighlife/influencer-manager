import type {
  AuthenticatedUser,
  LoginResponse,
} from "@influencer-manager/shared/types/mobile";

import { apiClient } from "./client";

export const authApi = {
  login(email: string, password: string) {
    return apiClient.post<LoginResponse>("/auth/login", { email, password });
  },
  me() {
    return apiClient.get<AuthenticatedUser>("/auth/me");
  },
  logout() {
    return apiClient.post("/auth/logout");
  },
};
