import { Link, useLocation, useNavigate } from "react-router-dom";
import type { PropsWithChildren } from "react";
import type { AuthenticatedUser } from "@influencer-manager/shared/types/mobile";

import { useAuthStore } from "../state/auth-store";
import {
  useUnratedPublishedActions,
  useOverdueActions,
} from "../hooks/use-campaign-builder";
import { useConversationList } from "../hooks/use-messaging";
import { NotificationBell } from "./NotificationBell";

interface AppShellProps extends PropsWithChildren {
  user: AuthenticatedUser;
  canPlan: boolean;
  isReadOnly: boolean;
}

export function AppShell({
  user,
  canPlan,
  isReadOnly,
  children,
}: AppShellProps) {
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();
  const location = useLocation();
  const { meta: unratedMeta } = useUnratedPublishedActions(undefined, 1, 1);
  const { meta: overdueMeta } = useOverdueActions(undefined, 1, 1);
  const hasActionAlerts =
    (unratedMeta?.total ?? 0) > 0 || (overdueMeta?.total ?? 0) > 0;
  const { meta: unreadInboxMeta } = useConversationList({ unread: true, limit: 1 });
  const unreadInboxCount = unreadInboxMeta?.total ?? 0;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-row">
            <div>
              <p className="eyebrow">Agency Workspace</p>
              <h1>Campaign Builder</h1>
            </div>
            <NotificationBell />
          </div>
        </div>
        <nav className="sidebar-nav">
          <Link
            className={location.pathname.startsWith("/campaigns") ? "nav-link nav-link-active" : "nav-link"}
            to="/campaigns"
          >
            Campaigns
          </Link>
          <Link
            className={location.pathname.startsWith("/clients") ? "nav-link nav-link-active" : "nav-link"}
            to="/clients"
          >
            Clients
          </Link>
          <Link
            className={location.pathname.startsWith("/influencers") ? "nav-link nav-link-active" : "nav-link"}
            to="/influencers"
          >
            Influencers
          </Link>
          <Link
            className={location.pathname.startsWith("/actions") ? "nav-link nav-link-active" : "nav-link"}
            to="/actions"
          >
            Actions
            {hasActionAlerts ? <span className="nav-alert-dot" /> : null}
          </Link>
          <Link
            className={location.pathname.startsWith("/inbox") ? "nav-link nav-link-active" : "nav-link"}
            to="/inbox"
          >
            Inbox
            {unreadInboxCount > 0 ? <span className="nav-alert-dot" /> : null}
          </Link>
          <Link
            className={location.pathname.startsWith("/templates") ? "nav-link nav-link-active" : "nav-link"}
            to="/templates"
          >
            Templates
          </Link>
        </nav>
        <div className="sidebar-user">
          <strong>{user.fullName}</strong>
          <span className="muted">{user.email}</span>
          <span className="badge badge-info">
            {canPlan ? "Planning access" : isReadOnly ? "Read-only" : user.role}
          </span>
          <button
            className="secondary-button"
            onClick={() => {
              clearSession();
              navigate("/");
            }}
            type="button"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
