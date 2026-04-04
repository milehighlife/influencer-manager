import { useState } from "react";
import { Link } from "react-router-dom";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { PageSection } from "../components/PageSection";
import {
  useUnratedPublishedActions,
  useOverdueActions,
  useReviewedActions,
} from "../hooks/use-campaign-builder";
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

  const [reviewPage, setReviewPage] = useState(1);
  const [overduePage, setOverduePage] = useState(1);
  const [reviewedPage, setReviewedPage] = useState(1);

  const {
    items: reviewItems,
    meta: reviewMeta,
    isLoading: reviewLoading,
    isError: reviewError,
    query: reviewQuery,
  } = useUnratedPublishedActions(trimmedSearch, reviewPage, PAGE_LIMIT);

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

  function handleSearchChange(value: string) {
    setSearch(value);
    setReviewPage(1);
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

      <PageSection eyebrow="Review" title="Submitted Actions — Awaiting Rating">
        {reviewLoading ? <p className="muted">Loading actions...</p> : null}
        {reviewError ? (
          <ErrorState
            message="Actions could not be loaded."
            onRetry={() => {
              void reviewQuery.refetch();
            }}
          />
        ) : null}
        {!reviewLoading && !reviewError && reviewItems.length === 0 ? (
          <EmptyState
            title={search ? "No actions match this search" : "All caught up"}
            message={
              search
                ? "Adjust search to broaden results."
                : "No submitted actions are awaiting a rating."
            }
          />
        ) : null}
        {!reviewLoading && !reviewError && reviewItems.length > 0 ? (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Client</th>
                  <th>Company</th>
                  <th>Influencer</th>
                </tr>
              </thead>
              <tbody>
                {reviewItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        to={`/influencers/${item.influencer_id}/campaigns/${item.campaign_id}/actions/${item.action_id}`}
                      >
                        {item.action_title}
                      </Link>
                    </td>
                    <td>{item.client_name ?? "—"}</td>
                    <td>{item.company_name ?? "—"}</td>
                    <td>
                      <Link to={`/influencers/${item.influencer_id}`}>
                        {item.influencer_name}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reviewMeta && reviewMeta.totalPages > 1 ? (
              <Pagination
                page={reviewMeta.page}
                totalPages={reviewMeta.totalPages}
                total={reviewMeta.total}
                label="actions"
                onPrev={() => setReviewPage((p) => Math.max(1, p - 1))}
                onNext={() =>
                  setReviewPage((p) =>
                    reviewMeta.totalPages > p ? p + 1 : p,
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
    </div>
  );
}
