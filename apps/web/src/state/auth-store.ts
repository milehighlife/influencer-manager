import type { AuthenticatedUser } from "@influencer-manager/shared/types/mobile";
import { create } from "zustand";

const STORAGE_KEY = "influencer-manager-web-session";

interface AuthState {
  accessToken: string | null;
  user: AuthenticatedUser | null;
  hasHydrated: boolean;
  sessionValidated: boolean;
  setSession: (session: { accessToken: string; user: AuthenticatedUser }) => void;
  updateUser: (user: AuthenticatedUser) => void;
  clearSession: () => void;
  markHydrated: () => void;
  setSessionValidated: (validated: boolean) => void;
}

function readSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as { accessToken: string; user: AuthenticatedUser | null };
  } catch {
    return null;
  }
}

function writeSession(session: { accessToken: string | null; user: AuthenticatedUser | null }) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session.accessToken) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

const initialSession = readSession();

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: initialSession?.accessToken ?? null,
  user: initialSession?.user ?? null,
  hasHydrated: false,
  sessionValidated: false,
  setSession: ({ accessToken, user }) => {
    writeSession({ accessToken, user });
    set({ accessToken, user, sessionValidated: true });
  },
  updateUser: (user) => {
    const accessToken = getSessionToken();
    writeSession({ accessToken, user });
    set({ user, sessionValidated: true });
  },
  clearSession: () => {
    writeSession({ accessToken: null, user: null });
    set({ accessToken: null, user: null, sessionValidated: false });
  },
  markHydrated: () => set({ hasHydrated: true }),
  setSessionValidated: (validated) => set({ sessionValidated: validated }),
}));

export function getSessionToken() {
  return useAuthStore.getState().accessToken;
}
