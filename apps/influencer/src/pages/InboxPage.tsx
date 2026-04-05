import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "../services/api";

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function InboxPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["influencer", "conversations"],
    queryFn: () => conversationsApi.list({ limit: 50 }),
  });

  const conversations = data?.data ?? [];

  const sorted = [...conversations].sort((a, b) => {
    const aTime = a.last_message?.created_at ?? "";
    const bTime = b.last_message?.created_at ?? "";
    return bTime.localeCompare(aTime);
  });

  return (
    <>
      <div className="page-header">
        <h1>Inbox</h1>
      </div>

      {isLoading && (
        <>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="inbox-row">
              <div className="skeleton" style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0 }} />
              <div className="inbox-body">
                <div className="skeleton skeleton-line" style={{ width: "70%", height: 16 }} />
                <div className="skeleton skeleton-line" style={{ width: "90%", height: 13, marginTop: 4 }} />
              </div>
              <div className="skeleton skeleton-line" style={{ width: 32, height: 12 }} />
            </div>
          ))}
        </>
      )}

      {!isLoading && sorted.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">&#128172;</div>
          <h3>No messages yet</h3>
          <p>Conversations with your team will appear here.</p>
        </div>
      )}

      {!isLoading &&
        sorted.map((conv) => (
          <div
            key={conv.id}
            className={`inbox-row ${conv.unread ? "inbox-row-unread" : ""}`}
            onClick={() => navigate(`/inbox/${conv.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") navigate(`/inbox/${conv.id}`);
            }}
          >
            <div className={`inbox-dot ${conv.unread ? "" : "inbox-dot-hidden"}`} />
            <div className="inbox-body">
              <p className="inbox-subject">{conv.subject}</p>
              {conv.last_message && (
                <p className="inbox-preview">
                  {conv.last_message.sender_name}: {conv.last_message.body}
                </p>
              )}
            </div>
            {conv.last_message && (
              <span className="inbox-time">
                {formatTime(conv.last_message.created_at)}
              </span>
            )}
          </div>
        ))}
    </>
  );
}
