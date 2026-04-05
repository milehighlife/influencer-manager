import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { authApi, profileApi } from "../services/api";
import { useAuthStore } from "../state/auth-store";
import { useState } from "react";

const PLATFORM_LABELS: Record<string, string> = {
  url_instagram: "Instagram",
  url_tiktok: "TikTok",
  url_youtube: "YouTube",
  url_facebook: "Facebook",
  url_x: "X",
  url_linkedin: "LinkedIn",
  url_threads: "Threads",
};

export function ProfilePage() {
  const navigate = useNavigate();
  const clearSession = useAuthStore((s) => s.clearSession);
  const [loggingOut, setLoggingOut] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["influencer", "profile"],
    queryFn: () => profileApi.get(),
  });

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // proceed regardless
    }
    clearSession();
    navigate("/", { replace: true });
  }

  if (isLoading) {
    return (
      <>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div className="skeleton" style={{ width: 72, height: 72, borderRadius: "50%" }} />
        </div>
        <div className="skeleton skeleton-line" style={{ width: "50%", height: 22, margin: "0 auto 4px" }} />
        <div className="skeleton skeleton-line" style={{ width: "60%", height: 14, margin: "0 auto 24px" }} />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </>
    );
  }

  if (!profile) return null;

  const initial = profile.name?.charAt(0)?.toUpperCase() ?? "?";

  const location = [profile.city, profile.state].filter(Boolean).join(", ");

  const platformEntries = Object.entries(PLATFORM_LABELS)
    .filter(([key]) => profile[key as keyof typeof profile])
    .map(([key, label]) => ({
      label,
      url: profile[key as keyof typeof profile] as string,
    }));

  return (
    <>
      <div className="profile-avatar">{initial}</div>
      <h1 className="profile-name">{profile.name}</h1>
      {profile.email && <p className="profile-email">{profile.email}</p>}
      {profile.rating_average != null && (
        <p className="profile-email" style={{ marginTop: 4 }}>
          {profile.rating_average.toFixed(1)} &#9733;
        </p>
      )}

      <div className="section" style={{ marginTop: 24 }}>
        <h2 className="section-title">Details</h2>
        {profile.phone && (
          <div className="profile-field">
            <span className="profile-field-label">Phone</span>
            <span>{profile.phone}</span>
          </div>
        )}
        {location && (
          <div className="profile-field">
            <span className="profile-field-label">Location</span>
            <span>{location}</span>
          </div>
        )}
        <div className="profile-field">
          <span className="profile-field-label">Primary Platform</span>
          <span style={{ textTransform: "capitalize" }}>{profile.primary_platform}</span>
        </div>
      </div>

      {platformEntries.length > 0 && (
        <div className="section">
          <h2 className="section-title">Platforms</h2>
          <div className="profile-platforms">
            {platformEntries.map(({ label, url }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="profile-platform-chip"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      )}

      {profile.clients.length > 0 && (
        <div className="section">
          <h2 className="section-title">Client Affiliations</h2>
          {profile.clients.map((name) => (
            <div key={name} className="profile-field">
              <span>{name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="section" style={{ marginTop: 16 }}>
        <button
          className="btn btn-danger btn-full"
          onClick={handleLogout}
          disabled={loggingOut}
          type="button"
        >
          {loggingOut ? "Signing out..." : "Sign Out"}
        </button>
      </div>
    </>
  );
}
