import { create } from "zustand";
import type { AuthenticatedUser } from "@influencer-manager/shared/types/mobile";

interface AuthState {
  user: AuthenticatedUser | null;
  setUser: (user: AuthenticatedUser) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearSession: () => set({ user: null }),
}));
