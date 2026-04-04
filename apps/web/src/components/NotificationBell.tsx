import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  useUnreadNotificationCount,
  useNotificationList,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from "../hooks/use-messaging";

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function entityRoute(
  entityType: string | null,
  entityId: string | null,
): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case "campaign":
      return `/campaigns/${entityId}`;
    case "influencer":
      return `/influencers/${entityId}`;
    case "action":
      return `/actions/${entityId}`;
    case "conversation":
      return `/inbox/${entityId}`;
    default:
      return null;
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: countData } = useUnreadNotificationCount();
  const unread = countData?.unread ?? 0;

  const { items, isLoading } = useNotificationList(1, 10);
  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleNotificationClick(notification: (typeof items)[number]) {
    if (!notification.read_at) {
      markRead.mutate(notification.id);
    }
    const route = entityRoute(
      notification.related_entity_type,
      notification.related_entity_id,
    );
    if (route) {
      navigate(route);
    }
    setOpen(false);
  }

  function handleMarkAllRead() {
    markAllRead.mutate();
  }

  return (
    <div className="notification-bell-container" ref={containerRef}>
      <button
        className="notification-bell-button"
        onClick={toggle}
        type="button"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="notification-bell-badge">{unread}</span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button
                className="notification-mark-all"
                onClick={handleMarkAllRead}
                type="button"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="notification-dropdown-list">
            {isLoading && (
              <p className="notification-empty">Loading...</p>
            )}
            {!isLoading && items.length === 0 && (
              <p className="notification-empty">No notifications</p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                className={`notification-item${n.read_at ? "" : " notification-item-unread"}`}
                onClick={() => handleNotificationClick(n)}
                type="button"
              >
                <div className="notification-item-header">
                  {!n.read_at && <span className="notification-unread-dot" />}
                  <span className="notification-item-title">{n.title}</span>
                  <span className="notification-item-time">
                    {formatTimestamp(n.created_at)}
                  </span>
                </div>
                <p className="notification-item-body">{n.body}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
