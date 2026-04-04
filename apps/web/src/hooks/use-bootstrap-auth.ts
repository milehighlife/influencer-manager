import { useEffect, useState } from "react";

import { authApi, ApiError } from "../services/api";
import { useAuthStore } from "../state/auth-store";

export function useBootstrapAuth() {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const markHydrated = useAuthStore((state) => state.markHydrated);
  const updateUser = useAuthStore((state) => state.updateUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setSessionValidated = useAuthStore((state) => state.setSessionValidated);

  useEffect(() => {
    markHydrated();
  }, [markHydrated]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      try {
        const user = await authApi.me();
        if (!cancelled) {
          updateUser(user);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError && error.status === 401) {
            clearSession();
          } else {
            clearSession();
          }
          setSessionValidated(false);
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [clearSession, hasHydrated, setSessionValidated, updateUser]);

  return { isBootstrapping };
}
