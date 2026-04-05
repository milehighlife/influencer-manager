import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "../services/api";

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      {!active && <polyline points="9 22 9 12 15 12 15 22" />}
    </svg>
  );
}

function InboxIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const TABS = [
  { path: "/", label: "Actions", Icon: HomeIcon },
  { path: "/inbox", label: "Inbox", Icon: InboxIcon },
  { path: "/profile", label: "Profile", Icon: ProfileIcon },
] as const;

export function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const unreadQuery = useQuery({
    queryKey: ["influencer", "conversations", "unread-count"],
    queryFn: async () => {
      const list = await conversationsApi.list({ limit: 100 });
      return list.data.filter((c) => c.unread).length;
    },
    refetchInterval: 30000,
  });
  const unreadCount = unreadQuery.data ?? 0;

  return (
    <nav className="tab-bar">
      {TABS.map(({ path, label, Icon }) => {
        const active =
          path === "/"
            ? location.pathname === "/" || location.pathname.startsWith("/actions")
            : location.pathname.startsWith(path);

        return (
          <button
            key={path}
            className={`tab-item ${active ? "tab-item-active" : ""}`}
            onClick={() => navigate(path)}
            type="button"
          >
            <span className="tab-icon">
              <Icon active={active} />
              {label === "Inbox" && unreadCount > 0 ? (
                <span className="tab-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
              ) : null}
            </span>
            <span className="tab-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
