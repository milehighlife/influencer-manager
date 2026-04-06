import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { assignmentsApi } from "../services/api";
import type { InfluencerWorkspaceAssignment } from "@influencer-manager/shared/types/mobile";

const COMPLETED_STATUSES = new Set(["approved", "completed", "completed_by_cascade", "declined"]);
const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

function getUrgency(assignment: InfluencerWorkspaceAssignment): "invited" | "overdue" | "soon" | "ontrack" | "done" {
  if (assignment.assignment_status === "invited") return "invited";
  if (COMPLETED_STATUSES.has(assignment.assignment_status)) return "done";
  if (!assignment.due_date) return "ontrack";

  const now = Date.now();
  const due = new Date(assignment.due_date).getTime();

  if (due < now) return "overdue";
  if (due - now < FORTY_EIGHT_HOURS) return "soon";
  return "ontrack";
}

function urgencyOrder(u: string): number {
  switch (u) {
    case "invited": return -1;
    case "overdue": return 0;
    case "soon": return 1;
    case "ontrack": return 2;
    case "done": return 3;
    default: return 4;
  }
}

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return "No due date";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays <= 7) return `Due in ${diffDays} days`;
  return `Due ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function statusChipClass(status: string): string {
  switch (status) {
    case "invited": return "chip invitation-badge";
    case "assigned": return "chip chip-info";
    case "accepted": return "chip chip-primary";
    case "in_progress": return "chip chip-warning";
    case "submitted": return "chip chip-primary";
    case "revision": return "chip chip-warning";
    case "approved": return "chip chip-success";
    case "rejected": return "chip chip-danger";
    case "completed":
    case "completed_by_cascade": return "chip chip-success";
    default: return "chip chip-neutral";
  }
}

function statusLabel(status: string): string {
  if (status === "invited") return "You're Invited";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ActionFeedPage() {
  const navigate = useNavigate();
  const [showCompleted, setShowCompleted] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => assignmentsApi.list({ limit: 100 }),
  });

  const assignments = data?.data ?? [];

  const sorted = [...assignments].sort((a, b) => {
    const ua = urgencyOrder(getUrgency(a));
    const ub = urgencyOrder(getUrgency(b));
    if (ua !== ub) return ua - ub;
    const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    return da - db;
  });

  const visible = showCompleted
    ? sorted
    : sorted.filter((a) => !COMPLETED_STATUSES.has(a.assignment_status));

  const pendingCount = sorted.filter((a) => !COMPLETED_STATUSES.has(a.assignment_status)).length;

  if (isLoading) {
    return (
      <>
        <div className="page-header">
          <h1>Actions</h1>
        </div>
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>Actions</h1>
        <p>{pendingCount} pending</p>
      </div>

      <div className="toggle-row">
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          Show Completed
          {showCompleted ? ` (${sorted.length - pendingCount})` : ""}
        </span>
        <label style={{ position: "relative", display: "inline-block", width: 48, height: 28 }}>
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
          />
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 14,
              background: showCompleted ? "var(--color-primary)" : "var(--color-border-strong)",
              transition: "background 0.2s",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 3,
                left: showCompleted ? 23 : 3,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
              }}
            />
          </span>
        </label>
      </div>

      {visible.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h3>You're all caught up</h3>
          <p>No pending actions right now.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {visible.map((assignment) => {
          const urgency = getUrgency(assignment);
          const isInvited = assignment.assignment_status === "invited";
          const cardClass = isInvited
            ? "action-card action-card-invited"
            : `action-card action-card-${urgency}`;

          return (
            <div
              key={assignment.id}
              className={cardClass}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/actions/${assignment.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/actions/${assignment.id}`);
                }
              }}
            >
              <div className="action-card-row" style={{ justifyContent: "space-between" }}>
                <h3 className="action-card-title">{assignment.action.title}</h3>
                {isInvited && (
                  <span className="chip invitation-badge">You're Invited</span>
                )}
              </div>
              <p className="action-card-campaign">
                {assignment.action.mission.campaign.name}
              </p>

              <div className="action-card-row">
                <span className="chip chip-neutral">{assignment.action.platform}</span>
                {assignment.action.content_format && (
                  <span className="chip chip-neutral">{assignment.action.content_format}</span>
                )}
                {!isInvited && (
                  <span className={statusChipClass(assignment.assignment_status)}>
                    {statusLabel(assignment.assignment_status)}
                  </span>
                )}
              </div>

              <div className="action-card-row" style={{ justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--color-ink-secondary)" }}>
                  {formatDueDate(assignment.due_date)}
                </span>
                {isInvited && (
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary-600)" }}>
                    View Invitation &rarr;
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
