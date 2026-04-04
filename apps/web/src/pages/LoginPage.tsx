import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";

import { authApi, ApiError } from "../services/api";
import { useAuthStore } from "../state/auth-store";

export function LoginPage() {
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState(import.meta.env.DEV ? "avery.chen@northstar.example" : "");
  const [password, setPassword] = useState(import.meta.env.DEV ? "AdminPass123!" : "");

  const loginMutation = useMutation({
    mutationFn: () => authApi.login(email, password),
    onSuccess: (response) => {
      setSession({ user: response.user });
    },
  });

  if (user) {
    return <Navigate to="/campaigns" replace />;
  }

  return (
    <div className="screen-center">
      <form
        className="panel login-panel"
        onSubmit={(event) => {
          event.preventDefault();
          loginMutation.mutate();
        }}
      >
        <p className="eyebrow">Desktop SaaS</p>
        <h1>Campaign Builder</h1>
        <p className="muted">
          Sign in with an agency or administrator account to manage campaign planning.
        </p>

        <label className="field">
          <span>Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {loginMutation.isError ? (
          <p className="error-copy">
            {loginMutation.error instanceof ApiError
              ? loginMutation.error.message
              : "Sign-in failed."}
          </p>
        ) : null}

        <button className="primary-button" type="submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
