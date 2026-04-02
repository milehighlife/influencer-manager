import { useEffect, useRef, useState } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuthStore, AUTH_STORAGE_KEY } from "../state/auth-store";

export const SESSION_BOOTSTRAP_TIMEOUT_MS = 5000;

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
) {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  });
}

export function useBootstrapAuth() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const sessionValidated = useAuthStore((state) => state.sessionValidated);
  const hydrateUser = useAuthStore((state) => state.hydrateUser);
  const logout = useAuthStore((state) => state.logout);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const setHydrated = useAuthStore((state) => state.setHydrated);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (hasHydrated) {
      return;
    }

    const rehydrate = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        restoreSession(storedToken);
      } finally {
        if (!isMountedRef.current) {
          return;
        }

        setHydrated(true);
      }
    };

    void rehydrate();
  }, [hasHydrated, restoreSession, setHydrated]);

  useEffect(() => {
    if (
      !hasHydrated ||
      !accessToken ||
      sessionValidated
    ) {
      return;
    }

    setIsBootstrapping(true);

    withTimeout(
      hydrateUser().then((user) => {
        const nextState = useAuthStore.getState();

        if (!nextState.sessionValidated || !nextState.user) {
          throw new Error("Session validation did not complete.");
        }

        return user;
      }),
      SESSION_BOOTSTRAP_TIMEOUT_MS,
      "Session bootstrap timed out.",
    )
      .catch(() => {
        logout();
      })
      .finally(() => {
        if (isMountedRef.current) {
          setIsBootstrapping(false);
        }
      });
  }, [
    accessToken,
    hasHydrated,
    hydrateUser,
    logout,
    sessionValidated,
  ]);

  return {
    isReady:
      hasHydrated &&
      (!accessToken || sessionValidated) &&
      !isBootstrapping,
  };
}
