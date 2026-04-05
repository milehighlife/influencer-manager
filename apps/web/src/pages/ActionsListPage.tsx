import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { PageSection } from "../components/PageSection";
import {
  useOverdueActions,
  useReviewedActions,
  usePendingReviewActions,
} from "../hooks/use-campaign-builder";
import { actionAssignmentsApi } from "../services/api";
import { formatDate } from "../utils/format";

const PAGE_LIMIT = 10;

function Pagination({
  page,
  totalPages,
  total,
  label,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  label: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="list-pagination">
      <p className="muted">
        Page {page} of {totalPages} · {total} {label}
      </p>
      <div className="inline-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={onPrev}
          disabled={page <= 1}
        >
          Previous
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function ActionsListPage() {
  const [search, setSearch] = useState("");
  const trimmedSearch = search.trim() || undefined;

  const [pendingPage, setPendingPage] = useState(1);
  const [overduePage, setOverduePage] = useState(1);
  const [reviewedPage, setReviewedPage] = useState(1);
  const [reviewingItemId, setReviewingItemId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    items: pendingItems,
    meta: pendingMeta,
    isLoading: pendingLoading,
    isError: pendingError,
    query: pendingQuery,
  } = usePendingReviewActions(trimmedSearch, pendingPage, PAGE_LIMIT);

  const {
    items: overdueItems,
    meta: overdueMeta,
    isLoading: overdueLoading,
    isError: overdueError,
    query: overdueQuery,
  } = useOverdueActions(trimmedSearch, overduePage, PAGE_LIMIT);

  const {
    items: reviewedItems,
    meta: reviewedMeta,
    isLoading: reviewedLoading,
    isError: reviewedError,
    query: reviewedQuery,
  } = useReviewedActions(trimmedSearch, reviewedPage, PAGE_LIMIT);

  const reviewingItem = reviewingItemId
    ? pendingItems.find((item) => item.id === reviewingItemId) ?? null
    : null;

  function handleSearchChange(value: string) {
    setSearch(value);
    setPendingPage(1);
    setOverduePage(1);
    setReviewedPage(1);
  }

  return (
    <div className="page-stack">
      <div className="search-bar-row">
        <input
          className="search-bar-input"
          type="search"
          value={search}
          placeholder="Search actions..."
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      <PageSection eyebrow="Pending" title="Pending Review — Submitted Assignments">
        {pendingLoading ? <p className="muted">Loading...</p> : null}
        {pendingError ? (
          <ErrorState
            message="Pending review items could not be loaded."
            onRetry={() => {
              void pendingQuery.refetch();
            }}
          />
        ) : null}
        {!pendingLoading && !pendingError && pendingItems.length === 0 ? (
          <EmptyState
            title={search ? "No pending items match this search" : "No pending reviews"}
            message={
              search
                ? "Adjust search to broaden results."
                : "No assignments are awaiting review."
            }
          />
        ) : null}
        {!pendingLoading && !pendingError && pendingItems.length > 0 ? (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Influencer</th>
                  <th>Campaign</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pendingItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.action_title}</td>
                    <td>
                      <Link to={`/influencers/${item.influencer_id}`}>
                        {item.influencer_name}
                      </Link>
                    </td>
                    <td>
                      {item.campaign_id ? (
                        <Link to={`/campaigns/${item.campaign_id}`}>
                          {item.campaign_name}
                        </Link>
                      ) : (
                        item.campaign_name ?? "—"
                      )}
                    </td>
                    <td>
                      {item.submitted_at
                        ? new Date(item.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        : "—"}
                    </td>
                    <td>
                      <Link
                        className="secondary-button"
                        to={`/influencers/${item.influencer_id}/campaigns/${item.campaign_id}/actions/${item.action_id}`}
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pendingMeta && pendingMeta.totalPages > 1 ? (
              <Pagination
                page={pendingMeta.page}
                totalPages={pendingMeta.totalPages}
                total={pendingMeta.total}
                label="pending"
                onPrev={() => setPendingPage((p) => Math.max(1, p - 1))}
                onNext={() =>
                  setPendingPage((p) =>
                    pendingMeta.totalPages > p ? p + 1 : p,
                  )
                }
              />
            ) : null}
          </>
        ) : null}
      </PageSection>

      <PageSection eyebrow="Overdue" title="Past Due Date">
        {overdueLoading ? <p className="muted">Loading...</p> : null}
        {overdueError ? (
          <ErrorState
            message="Overdue actions could not be loaded."
            onRetry={() => {
              void overdueQuery.refetch();
            }}
          />
        ) : null}
        {!overdueLoading && !overdueError && overdueItems.length === 0 ? (
          <EmptyState
            title={search ? "No overdue actions match this search" : "No overdue actions"}
            message={
              search
                ? "Adjust search to broaden results."
                : "All assigned actions are on schedule."
            }
          />
        ) : null}
        {!overdueLoading && !overdueError && overdueItems.length > 0 ? (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Influencer</th>
                  <th>Due Date</th>
                  <th>Client</th>
                  <th>Company</th>
                </tr>
              </thead>
              <tbody>
                {overdueItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        to={`/influencers/${item.influencer_id}/campaigns/${item.campaign_id}/actions/${item.action_id}`}
                      >
                        {item.action_title}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/influencers/${item.influencer_id}`}>
                        {item.influencer_name}
                      </Link>
                    </td>
                    <td>{formatDate(item.due_date)}</td>
                    <td>{item.client_name ?? "—"}</td>
                    <td>{item.company_name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {overdueMeta && overdueMeta.totalPages > 1 ? (
              <Pagination
                page={overdueMeta.page}
                totalPages={overdueMeta.totalPages}
                total={overdueMeta.total}
                label="overdue"
                onPrev={() => setOverduePage((p) => Math.max(1, p - 1))}
                onNext={() =>
                  setOverduePage((p) =>
                    overdueMeta.totalPages > p ? p + 1 : p,
                  )
                }
              />
            ) : null}
          </>
        ) : null}
      </PageSection>

      <PageSection eyebrow="Completed" title="Reviewed Actions">
        {reviewedLoading ? <p className="muted">Loading...</p> : null}
        {reviewedError ? (
          <ErrorState
            message="Reviewed actions could not be loaded."
            onRetry={() => {
              void reviewedQuery.refetch();
            }}
          />
        ) : null}
        {!reviewedLoading && !reviewedError && reviewedItems.length === 0 ? (
          <EmptyState
            title={search ? "No reviewed actions match this search" : "No reviewed actions"}
            message={
              search
                ? "Adjust search to broaden results."
                : "No actions have been reviewed yet."
            }
          />
        ) : null}
        {!reviewedLoading && !reviewedError && reviewedItems.length > 0 ? (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Influencer Name</th>
                  <th>Campaign</th>
                  <th>Rating</th>
                  <th>URL</th>
                </tr>
              </thead>
              <tbody>
                {reviewedItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link to={`/influencers/${item.influencer_id}`}>
                        {item.influencer_name}
                      </Link>
                    </td>
                    <td>
                      {item.campaign_id ? (
                        <Link to={`/campaigns/${item.campaign_id}`}>
                          {item.campaign_name}
                        </Link>
                      ) : (
                        item.campaign_name ?? "—"
                      )}
                    </td>
                    <td>
                      {item.rating_average != null
                        ? item.rating_average.toFixed(1)
                        : "—"}
                    </td>
                    <td>
                      {item.submission_url ? (
                        <a
                          className="primary-link"
                          href={item.submission_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reviewedMeta && reviewedMeta.totalPages > 1 ? (
              <Pagination
                page={reviewedMeta.page}
                totalPages={reviewedMeta.totalPages}
                total={reviewedMeta.total}
                label="reviewed"
                onPrev={() => setReviewedPage((p) => Math.max(1, p - 1))}
                onNext={() =>
                  setReviewedPage((p) =>
                    reviewedMeta.totalPages > p ? p + 1 : p,
                  )
                }
              />
            ) : null}
          </>
        ) : null}
      </PageSection>

      {reviewingItem ? (
        <ReviewAssignmentDialog
          item={reviewingItem}
          onClose={() => setReviewingItemId(null)}
          onSuccess={() => {
            setReviewingItemId(null);
            void pendingQuery.refetch();
            void queryClient.invalidateQueries({ queryKey: ["web", "action-assignments"] });
          }}
        />
      ) : null}
    </div>
  );
}

function ReviewAssignmentDialog({
  item,
  onClose,
  onSuccess,
}: {
  item: {
    id: string;
    action_title: string;
    influencer_name: string;
    campaign_name: string | null;
    submission_url?: string | null;
    due_date: string | null;
    rating_average?: number | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<"view" | "revision">("view");
  const [revisionReason, setRevisionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setSubmitting(true);
    setError(null);
    try {
      await actionAssignmentsApi.approve(item.id);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestRevision() {
    if (!revisionReason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await actionAssignmentsApi.requestRevision(item.id, revisionReason.trim());
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request revision.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="confirm-dialog cascade-dialog"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Review Submission</h3>

        <div className="cascade-dialog-body">
          <p style={{ margin: "0 0 8px" }}>
            <strong>{item.influencer_name}</strong> — {item.action_title}
          </p>
          {item.campaign_name ? (
            <p className="muted" style={{ margin: "0 0 8px", fontSize: 13 }}>
              Campaign: {item.campaign_name}
            </p>
          ) : null}

          {item.submission_url ? (
            <p style={{ margin: "0 0 12px" }}>
              <a
                className="primary-link"
                href={item.submission_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Submission
              </a>
            </p>
          ) : (
            <p className="muted" style={{ margin: "0 0 12px", fontSize: 13 }}>
              No submission URL provided.
            </p>
          )}

          {mode === "revision" ? (
            <label className="field" style={{ marginBottom: 12 }}>
              <span>Revision Reason (required)</span>
              <textarea
                rows={4}
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                placeholder="Explain what needs to be revised..."
                required
              />
            </label>
          ) : null}
        </div>

        {error ? <p className="error-copy" style={{ marginTop: 8 }}>{error}</p> : null}

        <div className="confirm-dialog-actions" style={{ marginTop: 16 }}>
          <button
            className="secondary-button"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          {mode === "view" ? (
            <>
              <button
                className="secondary-button danger-button"
                type="button"
                disabled={submitting}
                onClick={() => setMode("revision")}
              >
                Request Revision
              </button>
              <button
                className="primary-button"
                type="button"
                disabled={submitting}
                onClick={handleApprove}
              >
                {submitting ? "Approving..." : "Approve"}
              </button>
            </>
          ) : (
            <>
              <button
                className="secondary-button"
                type="button"
                disabled={submitting}
                onClick={() => setMode("view")}
              >
                Back
              </button>
              <button
                className="primary-button"
                type="button"
                disabled={submitting || !revisionReason.trim()}
                onClick={handleRequestRevision}
              >
                {submitting ? "Sending..." : "Send Revision Request"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
