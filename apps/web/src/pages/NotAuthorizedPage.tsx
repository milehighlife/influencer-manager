import { useAuthStore } from "../state/auth-store";
import { authApi } from "../services/api";

export function NotAuthorizedPage() {
  const clearSession = useAuthStore((state) => state.clearSession);

  async function handleLogout() {
    try { await authApi.logout(); } catch {}
    clearSession();
  }

  return (
    <div className="screen-center">
      <div className="panel">
        <p className="eyebrow">Access</p>
        <h1>Desktop planning is not available for this role</h1>
        <p className="muted">
          The campaign builder is reserved for agency and administrator users. Influencer self-service remains on mobile.
        </p>
        <button
          className="primary-button"
          type="button"
          style={{ marginTop: 16 }}
          onClick={handleLogout}
        >
          Sign out and switch account
        </button>
      </div>
    </div>
  );
}
