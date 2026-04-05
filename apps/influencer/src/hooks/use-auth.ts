import { useEffect, useState } from "react";
import { useAuthStore } from "../state/auth-store";
import { authApi } from "../services/api";

export function useBootstrapAuth() {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    authApi
      .me()
      .then((user) => setUser(user))
      .catch(() => {})
      .finally(() => setIsBootstrapping(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { isBootstrapping };
}
