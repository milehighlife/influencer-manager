import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AuthenticatedUser } from "@influencer-manager/shared/types/mobile";
import { create } from "zustand";

import { authApi } from "../services/api";
import {
  clearSessionToken,
  setSessionToken,
} from "../services/auth/session";

export const AUTH_STORAGE_KEY = "mobile-auth-token";

interface AuthState {
  accessToken: string | null;
  user: AuthenticatedUser | null;
  hasHydrated: boolean;
  sessionValidated: boolean;
  isAuthenticating: boolean;
  setHydrated: (value: boolean) => void;
  clearUserCache: () => void;
  restoreSession: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  hydrateUser: () => Promise<AuthenticatedUser>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  user: null,
  hasHydrated: false,
  sessionValidated: false,
  isAuthenticating: false,
  setHydrated: (value) => set({ hasHydrated: value }),
  clearUserCache: () => set({ user: null, sessionValidated: false }),
  restoreSession: (token) => {
    setSessionToken(token);
    set({
      accessToken: token,
      user: null,
      sessionValidated: false,
    });
  },
  login: async (email, password) => {
    set({ isAuthenticating: true });

    try {
      const response = await authApi.login(email, password);

      setSessionToken(response.access_token);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, response.access_token);
      set({
        accessToken: response.access_token,
        user: response.user,
        sessionValidated: true,
        isAuthenticating: false,
      });
    } catch (error) {
      set({ isAuthenticating: false });
      throw error;
    }
  },
  hydrateUser: async () => {
    const { accessToken } = get();

    if (!accessToken) {
      clearSessionToken();
      set({ user: null, sessionValidated: false });
      throw new Error("Missing session token.");
    }

    setSessionToken(accessToken);
    const user = await authApi.me();
    set({ user, sessionValidated: true });
    return user;
  },
  logout: () => {
    void AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    clearSessionToken();
    set({
      accessToken: null,
      user: null,
      sessionValidated: false,
      isAuthenticating: false,
    });
  },
}));
