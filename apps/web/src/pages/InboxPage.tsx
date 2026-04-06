import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { PageSection } from "../components/PageSection";
import { StatusBadge } from "../components/StatusBadge";
import {
  useConversationList,
  useCreateConversationMutation,
  useArchiveConversationMutation,
  useBulkArchiveMutation,
  useBulkActionAllMutation,
  useBulkMarkReadMutation,
  useBulkMarkUnreadMutation,
  useBatchGroups,
  useBatchConversations,
} from "../hooks/use-messaging";
import { formatDate } from "../utils/format";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

function formatInboxDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type InboxFilter = "all" | "unread" | "needs_reply" | "sent_by_me" | "archived";

const FILTER_OPTIONS: { value: InboxFilter; label: string }[] = [
  { value: "all", label: "Active" },
  { value: "unread", label: "Unread" },
  { value: "needs_reply", label: "Needs Reply" },
  { value: "sent_by_me", label: "Sent by Me" },
  { value: "archived", label: "Archived" },
];

export function InboxPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page") || DEFAULT_PAGE);
  const search = searchParams.get("search") ?? "";
  const filterParam = (searchParams.get("filter") ?? "unread") as InboxFilter;

  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllPages, setSelectAllPages] = useState(false);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [form, setForm] = useState({
    subject: "",
    influencerId: "",
    initialMessage: "",
  });

  const queryParams = {
    page,
    limit: DEFAULT_LIMIT,
    search: search || undefined,
    unread: filterParam === "unread" ? true : undefined,
    needs_reply: filterParam === "needs_reply" ? true : undefined,
    sent_by_me: filterParam === "sent_by_me" ? true : undefined,
    status: filterParam === "archived" ? "archived" : "active",
  };

  const { items, meta, isLoading, isError, query } = useConversationList(queryParams);
  const createMutation = useCreateConversationMutation();
  const archiveMutation = useArchiveConversationMutation();
  const bulkArchiveMutation = useBulkArchiveMutation();
  const bulkMarkReadMutation = useBulkMarkReadMutation();
  const bulkMarkUnreadMutation = useBulkMarkUnreadMutation();
  const bulkActionAllMutation = useBulkActionAllMutation();
  const batchGroupsQuery = useBatchGroups();
  const batchGroups = batchGroupsQuery.data ?? [];
  const batchConversationsQuery = useBatchConversations(expandedBatch ?? undefined);
  const batchConversations = batchConversationsQuery.data ?? [];

  function updateSearchParams(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    setSearchParams(next);
  }

  const totalCount = meta?.total ?? 0;
  const allOnPageSelected = items.length > 0 && items.every((c) => selectedIds.has(c.id));
  const isBulkPending =
    bulkMarkReadMutation.isPending ||
    bulkMarkUnreadMutation.isPending ||
    bulkArchiveMutation.isPending ||
    bulkActionAllMutation.isPending;

  function toggleSelect(id: string) {
    setSelectAllPages(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setSelectAllPages(false);
  }

  function handleBulkAction(action: "read" | "unread" | "archive") {
    if (selectAllPages) {
      bulkActionAllMutation.mutate(
        {
          action,
          status: filterParam === "archived" ? "archived" : "active",
          search: search || undefined,
        },
        { onSuccess: clearSelection },
      );
    } else {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      if (action === "read") {
        bulkMarkReadMutation.mutate(ids, { onSuccess: clearSelection });
      } else if (action === "unread") {
        bulkMarkUnreadMutation.mutate(ids, { onSuccess: clearSelection });
      } else {
        bulkArchiveMutation.mutate(ids, { onSuccess: clearSelection });
      }
    }
  }

  const hasFilters = Boolean(search) || filterParam !== "all";

  return (
    <div className="page-stack">
      <div className="search-bar-row">
        <input
          className="search-bar-input"
          type="search"
          value={search}
          placeholder="Search conversations..."
          onChange={(event) => {
            updateSearchParams({
              search: event.target.value || undefined,
              page: undefined,
            });
          }}
        />
        <button
          className="primary-button"
          type="button"
          onClick={() => setShowNewForm((v) => !v)}
        >
          {showNewForm ? "Close" : "New Conversation"}
        </button>
      </div>

      <div className="status-filter-bar">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`status-filter-chip ${filterParam === opt.value ? "status-filter-chip-active" : ""}`}
            onClick={() =>
              updateSearchParams({
                filter: opt.value === "unread" ? undefined : opt.value,
                page: undefined,
              })
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {showNewForm ? (
        <PageSection eyebrow="Create" title="New conversation">
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate(
                {
                  subject: form.subject,
                  influencer_id: form.influencerId,
                  initial_message: form.initialMessage || undefined,
                },
                {
                  onSuccess: (conversation) => {
                    setForm({ subject: "", influencerId: "", initialMessage: "" });
                    setShowNewForm(false);
                    void navigate(`/inbox/${conversation.id}`);
                  },
                },
              );
            }}
          >
            <label className="field">
              <span>Subject</span>
              <input
                value={form.subject}
                onChange={(event) =>
                  setForm((c) => ({ ...c, subject: event.target.value }))
                }
                required
              />
            </label>
            <label className="field">
              <span>Influencer ID</span>
              <input
                value={form.influencerId}
                placeholder="Enter influencer ID"
                onChange={(event) =>
                  setForm((c) => ({ ...c, influencerId: event.target.value }))
                }
                required
              />
            </label>
            <label className="field field-span-2">
              <span>Initial message</span>
              <textarea
                value={form.initialMessage}
                onChange={(event) =>
                  setForm((c) => ({ ...c, initialMessage: event.target.value }))
                }
                rows={3}
              />
            </label>
            {createMutation.isError ? (
              <p className="error-copy field-span-2">
                {createMutation.error.message}
              </p>
            ) : null}
            <div className="field-span-2 form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Start conversation"}
              </button>
            </div>
          </form>
        </PageSection>
      ) : null}

      {/* Batch outreach groups */}
      {filterParam !== "archived" && batchGroups.length > 0 ? (
        <PageSection eyebrow="Bulk Outreach" title="Outreach Campaigns">
          <div className="inbox-list">
            {batchGroups.map((batch) => (
              <div key={batch.batch_id}>
                <div
                  className="inbox-row"
                  onClick={() =>
                    setExpandedBatch((prev) =>
                      prev === batch.batch_id ? null : batch.batch_id,
                    )
                  }
                >
                  <div className="inbox-row-content">
                    <p className="inbox-row-subject">
                      Outreach: {batch.template_name}
                    </p>
                    <p className="inbox-row-preview">
                      Sent to {batch.total_conversations} influencers
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <StatusBadge
                      label={`${batch.replied} of ${batch.total_conversations} replied`}
                      tone={batch.replied > 0 ? "success" : "info"}
                    />
                    {batch.unread_replies > 0 ? (
                      <span className="nav-badge">{batch.unread_replies}</span>
                    ) : null}
                    <span className="muted" style={{ fontSize: 12 }}>
                      {expandedBatch === batch.batch_id ? "▲" : "▼"}
                    </span>
                  </div>
                </div>
                {expandedBatch === batch.batch_id ? (
                  <div style={{ paddingLeft: 24 }}>
                    {batchConversationsQuery.isLoading ? (
                      <p className="muted" style={{ padding: 8 }}>Loading...</p>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Influencer</th>
                            <th>Last Message</th>
                            <th>Messages</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchConversations.map((conv) => (
                            <tr
                              key={conv.id}
                              style={{
                                fontWeight: conv.unread ? 700 : 400,
                                cursor: "pointer",
                              }}
                              onClick={() => void navigate(`/inbox/${conv.id}`)}
                            >
                              <td>{conv.influencer_name ?? conv.subject}</td>
                              <td>
                                {conv.last_message
                                  ? truncate(conv.last_message.body, 60)
                                  : "—"}
                              </td>
                              <td>{conv.message_count}</td>
                              <td>{formatDate(conv.updated_at, { mode: "datetime" })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </PageSection>
      ) : null}

      <PageSection
        eyebrow="Inbox"
        title="Conversations"
        actions={
          selectedIds.size > 0 || selectAllPages ? (
            <div className="inline-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={isBulkPending}
                onClick={() => handleBulkAction("read")}
              >
                Mark Read
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={isBulkPending}
                onClick={() => handleBulkAction("unread")}
              >
                Mark Unread
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={isBulkPending}
                onClick={() => handleBulkAction("archive")}
              >
                Archive
              </button>
              <span className="muted" style={{ fontSize: 13 }}>
                {selectAllPages
                  ? `All ${totalCount} conversations`
                  : `${selectedIds.size} selected`}
              </span>
            </div>
          ) : undefined
        }
      >
        {isLoading ? <p className="muted">Loading conversations...</p> : null}
        {isError ? (
          <ErrorState
            message="Conversations could not be loaded."
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : null}
        {!isLoading && !isError && items.length === 0 ? (
          <EmptyState
            title={
              hasFilters
                ? "No conversations match"
                : "No conversations yet"
            }
            message={
              hasFilters
                ? "Adjust search or filters to find conversations."
                : "Start a new conversation to begin messaging."
            }
          />
        ) : null}
        {!isLoading && !isError && items.length > 0 ? (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={() => {
                        if (allOnPageSelected) {
                          clearSelection();
                        } else {
                          setSelectedIds(new Set(items.map((c) => c.id)));
                          setSelectAllPages(false);
                        }
                      }}
                    />
                  </th>
                  <th>Subject</th>
                  <th>From</th>
                  <th>Date</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              {allOnPageSelected && !selectAllPages && totalCount > items.length ? (
                <caption style={{ captionSide: "bottom" as const, padding: "8px 12px", background: "var(--color-primary-surface)", fontSize: 13, textAlign: "center" }}>
                  All {items.length} conversations on this page are selected.{" "}
                  <button
                    type="button"
                    className="primary-link"
                    style={{ background: "none", border: "none", cursor: "pointer", font: "inherit", fontWeight: 600, color: "var(--color-primary)" }}
                    onClick={() => setSelectAllPages(true)}
                  >
                    Select all {totalCount} conversations
                  </button>
                </caption>
              ) : null}
              {selectAllPages ? (
                <caption style={{ captionSide: "bottom" as const, padding: "8px 12px", background: "var(--color-primary-surface)", fontSize: 13, textAlign: "center" }}>
                  All {totalCount} conversations are selected.{" "}
                  <button
                    type="button"
                    className="primary-link"
                    style={{ background: "none", border: "none", cursor: "pointer", font: "inherit", fontWeight: 600, color: "var(--color-primary)" }}
                    onClick={clearSelection}
                  >
                    Clear selection
                  </button>
                </caption>
              ) : null}
              <tbody>
                {items.map((conversation) => (
                  <tr
                    key={conversation.id}
                    style={{
                      fontWeight: conversation.unread ? 700 : 400,
                    }}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(conversation.id)}
                        onChange={() => toggleSelect(conversation.id)}
                      />
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {conversation.unread ? (
                          <span className="inbox-unread-dot" />
                        ) : null}
                        <Link to={`/inbox/${conversation.id}`}>
                          {conversation.subject}
                        </Link>
                      </span>
                    </td>
                    <td>{conversation.influencer_name ?? "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {formatInboxDate(
                        conversation.last_message?.created_at ??
                          conversation.updated_at,
                      )}
                    </td>
                    <td>
                      {filterParam !== "archived" ? (
                        <button
                          className="remove-button"
                          type="button"
                          onClick={() => archiveMutation.mutate(conversation.id)}
                          disabled={archiveMutation.isPending}
                        >
                          Archive
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meta ? (
              <div className="list-pagination">
                <p className="muted">
                  Page {meta.page} of {meta.totalPages} &middot; {meta.total}{" "}
                  conversations
                </p>
                <div className="inline-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      updateSearchParams({
                        page: page > 1 ? String(page - 1) : undefined,
                      })
                    }
                    disabled={meta.page <= 1}
                  >
                    Previous
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      updateSearchParams({
                        page:
                          meta.totalPages > page
                            ? String(page + 1)
                            : String(page),
                      })
                    }
                    disabled={meta.page >= meta.totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </PageSection>
    </div>
  );
}
