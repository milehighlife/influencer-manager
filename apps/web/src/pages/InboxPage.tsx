import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { PageSection } from "../components/PageSection";
import {
  useConversationList,
  useCreateConversationMutation,
} from "../hooks/use-messaging";
import { formatDate } from "../utils/format";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

export function InboxPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page") || DEFAULT_PAGE);
  const search = searchParams.get("search") ?? "";
  const unreadOnly = searchParams.get("unread") === "1";

  const [showNewForm, setShowNewForm] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    influencerId: "",
    initialMessage: "",
  });

  const { items, meta, isLoading, isError, query } = useConversationList({
    page,
    limit: DEFAULT_LIMIT,
    search: search || undefined,
    unread: unreadOnly || undefined,
  });

  const createMutation = useCreateConversationMutation();

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
          className={`secondary-button ${unreadOnly ? "button-active" : ""}`}
          type="button"
          onClick={() => {
            updateSearchParams({
              unread: unreadOnly ? undefined : "1",
              page: undefined,
            });
          }}
        >
          {unreadOnly ? "Show All" : "Unread Only"}
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={() => setShowNewForm((v) => !v)}
        >
          {showNewForm ? "Close" : "New Conversation"}
        </button>
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

      <PageSection eyebrow="Inbox" title="Conversations">
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
              search || unreadOnly
                ? "No conversations match"
                : "No conversations yet"
            }
            message={
              search || unreadOnly
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
                  <th>Subject</th>
                  <th>Last Message</th>
                  <th>From</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((conversation) => (
                  <tr
                    key={conversation.id}
                    style={{
                      fontWeight: conversation.unread ? 700 : 400,
                      cursor: "pointer",
                    }}
                    onClick={() => void navigate(`/inbox/${conversation.id}`)}
                  >
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                        {conversation.unread ? (
                          <span
                            className="unread-dot"
                            style={{
                              display: "inline-block",
                              width: "0.5rem",
                              height: "0.5rem",
                              borderRadius: "50%",
                              backgroundColor: "var(--color-primary, #3b82f6)",
                              flexShrink: 0,
                            }}
                          />
                        ) : null}
                        <Link
                          to={`/inbox/${conversation.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {conversation.subject}
                        </Link>
                      </span>
                    </td>
                    <td>
                      {conversation.last_message
                        ? truncate(conversation.last_message.body, 80)
                        : <span className="muted">No messages</span>}
                    </td>
                    <td>
                      {conversation.last_message?.sender_name ?? "—"}
                    </td>
                    <td>
                      {formatDate(
                        conversation.last_message?.created_at ??
                          conversation.updated_at,
                        { mode: "datetime" },
                      )}
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
