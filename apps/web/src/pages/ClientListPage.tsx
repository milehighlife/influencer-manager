import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { PageSection } from "../components/PageSection";
import {
  useClientListItems,
  useCreateClientMutation,
} from "../hooks/use-client-manager";
const CLIENT_STATUSES = ["active", "inactive", "archived"] as const;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;

interface ListSearchState {
  page: number;
  limit: number;
  search: string;
}

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function parseSearchParams(searchParams: URLSearchParams): ListSearchState {
  return {
    page: parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE),
    limit: parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT),
    search: searchParams.get("search") ?? "",
  };
}

function buildSearchParams(state: ListSearchState) {
  const next = new URLSearchParams();

  if (state.search) {
    next.set("search", state.search);
  }
  if (state.page !== DEFAULT_PAGE) {
    next.set("page", String(state.page));
  }
  if (state.limit !== DEFAULT_LIMIT) {
    next.set("limit", String(state.limit));
  }

  return next;
}

export function ClientListPage({ canPlan }: { canPlan: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const queryState = useMemo(
    () => parseSearchParams(searchParams),
    [searchParams],
  );
  const { page, limit, search } = queryState;
  const { items, meta, isLoading, isError, clientsQuery } = useClientListItems({
    page,
    limit,
    search: search || undefined,
  });
  const createMutation = useCreateClientMutation();
  const [createFormError, setCreateFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    industry: "",
    primaryContactFirstName: "",
    primaryContactName: "",
    primaryContactEmail: "",
    primaryContactPhone: "",
    status: "active",
  });
  const hasActiveFilters = Boolean(search);
  const visibleCreateError = createMutation.isError
    ? createMutation.error.message
    : createFormError;

  function updateQueryState(
    updater:
      | Partial<ListSearchState>
      | ((current: ListSearchState) => ListSearchState),
  ) {
    const current = parseSearchParams(searchParams);
    const next =
      typeof updater === "function"
        ? updater(current)
        : { ...current, ...updater };

    setSearchParams(buildSearchParams(next));
  }

  return (
    <div className="page-stack">
      <div className="search-bar-row">
        <input
          className="search-bar-input"
          type="search"
          value={search}
          placeholder="Search clients..."
          onChange={(event) => {
            updateQueryState({ search: event.target.value, page: DEFAULT_PAGE });
          }}
        />
        {canPlan ? (
          <button
            className="primary-button"
            type="button"
            onClick={() => setShowCreateForm((value) => !value)}
          >
            {showCreateForm ? "Close" : "Create Client"}
          </button>
        ) : null}
      </div>

      {showCreateForm ? (
        <PageSection eyebrow="Create" title="New client">
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              if (!form.name.trim()) {
                setCreateFormError("Client name is required.");
                return;
              }
              setCreateFormError(null);
              createMutation.mutate(
                {
                  name: form.name,
                  industry: form.industry || undefined,
                  primary_contact_first_name: form.primaryContactFirstName || undefined,
                  primary_contact_name: form.primaryContactName || undefined,
                  primary_contact_email: form.primaryContactEmail || undefined,
                  primary_contact_phone: form.primaryContactPhone || undefined,
                  status: form.status,
                },
                {
                  onSuccess: () => {
                    setForm({
                      name: "",
                      industry: "",
                      primaryContactFirstName: "",
                      primaryContactName: "",
                      primaryContactEmail: "",
                      primaryContactPhone: "",
                      status: "active",
                    });
                    setShowCreateForm(false);
                    setCreateFormError(null);
                  },
                },
              );
            }}
          >
            <label className="field">
              <span>Name</span>
              <input
                value={form.name}
                onChange={(event) => {
                  setCreateFormError(null);
                  setForm((current) => ({ ...current, name: event.target.value }));
                }}
                required
              />
            </label>
            <label className="field">
              <span>Industry</span>
              <input
                value={form.industry}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    industry: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Contact first name</span>
              <input
                value={form.primaryContactFirstName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    primaryContactFirstName: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Contact last name</span>
              <input
                value={form.primaryContactName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    primaryContactName: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Contact email</span>
              <input
                type="email"
                value={form.primaryContactEmail}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    primaryContactEmail: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Phone</span>
              <input
                type="tel"
                value={form.primaryContactPhone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    primaryContactPhone: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value }))
                }
              >
                {CLIENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            {visibleCreateError ? (
              <p className="error-copy field-span-2">{visibleCreateError}</p>
            ) : null}
            <div className="field-span-2 form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create client"}
              </button>
            </div>
          </form>
        </PageSection>
      ) : null}

      <PageSection eyebrow="List" title="Clients">
        {isLoading ? <p className="muted">Loading clients...</p> : null}
        {isError ? (
          <ErrorState
            message="Clients could not be loaded."
            onRetry={() => {
              void clientsQuery.refetch();
            }}
          />
        ) : null}
        {!isLoading && !isError && items.length === 0 ? (
          <EmptyState
            title={
              hasActiveFilters
                ? "No clients match this view"
                : "No clients yet"
            }
            message={
              hasActiveFilters
                ? "Adjust search or filters to broaden the client list."
                : "Create the first client to begin organizing companies and campaigns."
            }
          />
        ) : null}
        {!isLoading && !isError && items.length > 0 ? (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact Name</th>
                  <th>Phone</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link to={`/clients/${item.id}`}>{item.name}</Link>
                    </td>
                    <td>
                      {[item.primary_contact_first_name, item.primary_contact_name]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </td>
                    <td>{item.primary_contact_phone ?? "—"}</td>
                    <td>
                      <Link
                        className="secondary-button"
                        to={`/clients/${item.id}`}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meta ? (
              <div className="list-pagination">
                <p className="muted">
                  Page {meta.page} of {meta.totalPages} · {meta.total} clients
                </p>
                <div className="inline-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      updateQueryState((current) => ({
                        ...current,
                        page: Math.max(DEFAULT_PAGE, current.page - 1),
                      }))
                    }
                    disabled={meta.page <= 1}
                  >
                    Previous
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      updateQueryState((current) => ({
                        ...current,
                        page:
                          meta.totalPages > current.page
                            ? current.page + 1
                            : current.page,
                      }))
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
