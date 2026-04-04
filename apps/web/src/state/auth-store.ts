import type { AuthenticatedUser } from "@influencer-manager/shared/types/mobile";
import { create } from "zustand";

const STORAGE_KEY = "influencer-manager-web-user";

interface AuthState {
  user: AuthenticatedUser | null;
  hasHydrated: boolean;
  sessionValidated: boolean;
  setSession: (session: { user: AuthenticatedUser }) => void;
  updateUser: (user: AuthenticatedUser) => void;
  clearSession: () => void;
  markHydrated: () => void;
  setSessionValidated: (validated: boolean) => void;
}

function readUser(): AuthenticatedUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthenticatedUser;
  } catch {
    return null;
  }
}

function writeUser(user: AuthenticatedUser | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!user) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

const initialUser = readUser();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  hasHydrated: false,
  sessionValidated: false,
  setSession: ({ user }) => {
    writeUser(user);
    set({ user, sessionValidated: true });
  },
  updateUser: (user) => {
    writeUser(user);
    set({ user, sessionValidated: true });
  },
  clearSession: () => {
    writeUser(null);
    set({ user: null, sessionValidated: false });
  },
  markHydrated: () => set({ hasHydrated: true }),
  setSessionValidated: (validated) => set({ sessionValidated: validated }),
}));
