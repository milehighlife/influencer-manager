import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Company } from "@influencer-manager/shared/types/mobile";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { PageSection } from "../components/PageSection";
import { StatusBadge } from "../components/StatusBadge";
import {
  useCompanyListItems,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useDeleteCompanyMutation,
} from "../hooks/use-company-manager";
import {
  getLookupHelperMessage,
  mergeLookupOptions,
  useClientLookupQuery,
} from "../hooks/use-campaign-builder";

const COMPANY_STATUSES = ["active", "inactive", "archived"] as const;
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

function statusTone(status: string): "info" | "success" | "warning" | "danger" {
  if (status === "active") return "success";
  if (status === "archived") return "warning";
  return "info";
}

function CompanyEditForm({
  company,
  onClose,
}: {
  company: Company;
  onClose: () => void;
}) {
  const updateMutation = useUpdateCompanyMutation(company.id);
  const [form, setForm] = useState({
    name: company.name,
    description: company.description ?? "",
    status: company.status,
  });

  return (
    <form
      className="compact-form form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        updateMutation.mutate(
          {
            name: form.name,
            description: form.description || null,
            status: form.status,
          },
          { onSuccess: onClose },
        );
      }}
    >
      <label className="field">
        <span>Name</span>
        <input
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
          required
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
          {COMPANY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="field field-span-2">
        <span>Description</span>
        <textarea
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          rows={3}
        />
      </label>
      {updateMutation.isError ? (
        <p className="error-copy field-span-2">
          {updateMutation.error.message}
        </p>
      ) : null}
      <div className="field-span-2 form-actions inline-actions">
        <button className="secondary-button" type="button" onClick={onClose}>
          Cancel
        </button>
        <button
          className="primary-button"
          type="submit"
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "Saving..." : "Save company"}
        </button>
      </div>
    </form>
  );
}

function CompanyRow({
  item,
  canPlan,
  isEditing,
  isDeleting,
  onEdit,
  onCancelEdit,
  onDelete,
}: {
  item: Company;
  canPlan: boolean;
  isEditing: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const colSpan = canPlan ? 4 : 3;

  return (
    <>
      <tr>
        <td>
          <strong>{item.name}</strong>
          {item.description ? (
            <p className="muted" style={{ margin: "4px 0 0" }}>{item.description}</p>
          ) : null}
        </td>
        <td>{item.client_name ?? "—"}</td>
        <td>
          <StatusBadge label={item.status} tone={statusTone(item.status)} />
        </td>
        {canPlan ? (
          <td>
            <div className="inline-actions">
              {!isEditing ? (
                <>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={onEdit}
                  >
                    Edit
                  </button>
                  <button
                    className="secondary-button danger-button"
                    type="button"
                    disabled={isDeleting}
                    onClick={onDelete}
                  >
                    Delete
                  </button>
                </>
              ) : null}
            </div>
          </td>
        ) : null}
      </tr>
      {isEditing ? (
        <tr>
          <td colSpan={colSpan} style={{ padding: "16px 14px" }}>
            <CompanyEditForm company={item} onClose={onCancelEdit} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function CompanyListPage({ canPlan }: { canPlan: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [createClientLookupSearch, setCreateClientLookupSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const queryState = useMemo(
    () => parseSearchParams(searchParams),
    [searchParams],
  );
  const { page, limit, search } = queryState;

  const createClientsQuery = useClientLookupQuery(createClientLookupSearch);
  const createClientOptions = useMemo(
    () => mergeLookupOptions(null, createClientsQuery.data?.data ?? []),
    [createClientsQuery.data?.data],
  );
  const createClientLookupHelper = getLookupHelperMessage({
    searchTerm: createClientLookupSearch,
    subject: "clients",
    count: createClientsQuery.data?.data.length ?? 0,
  });

  const { items, meta, isLoading, isError, companiesQuery } =
    useCompanyListItems({
      page,
      limit,
      search: search || undefined,
    });
  const createMutation = useCreateCompanyMutation();
  const deleteMutation = useDeleteCompanyMutation();
  const [createFormError, setCreateFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientId: "",
    name: "",
    description: "",
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
          placeholder="Search companies..."
          onChange={(event) => {
            updateQueryState({
              search: event.target.value,
              page: DEFAULT_PAGE,
            });
          }}
        />
        {canPlan ? (
          <button
            className="primary-button"
            type="button"
            onClick={() => setShowCreateForm((value) => !value)}
          >
            {showCreateForm ? "Close" : "Create Company"}
          </button>
        ) : null}
      </div>

      {showCreateForm ? (
        <PageSection eyebrow="Create" title="New company">
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              if (!form.clientId) {
                setCreateFormError(
                  "Select a client before creating a company.",
                );
                return;
              }
              if (!form.name.trim()) {
                setCreateFormError("Company name is required.");
                return;
              }
              setCreateFormError(null);
              createMutation.mutate(
                {
                  client_id: form.clientId,
                  name: form.name,
                  description: form.description || undefined,
                  status: form.status,
                },
                {
                  onSuccess: () => {
                    setForm({
                      clientId: "",
                      name: "",
                      description: "",
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
              <span>Client lookup</span>
              <div className="field-input-stack">
                <input
                  type="search"
                  value={createClientLookupSearch}
                  placeholder="Type to search clients"
                  onChange={(event) =>
                    setCreateClientLookupSearch(event.target.value)
                  }
                />
                <select
                  value={form.clientId}
                  onChange={(event) => {
                    setCreateFormError(null);
                    setForm((current) => ({
                      ...current,
                      clientId: event.target.value,
                    }));
                  }}
                >
                  <option value="">Select client</option>
                  {createClientOptions.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="muted field-helper-text">
                {createClientLookupHelper}
              </p>
            </label>
            <label className="field">
              <span>Name</span>
              <input
                value={form.name}
                onChange={(event) => {
                  setCreateFormError(null);
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }));
                }}
                required
              />
            </label>
            <label className="field field-span-2">
              <span>Description</span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
              >
                {COMPANY_STATUSES.map((s) => (
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
                {createMutation.isPending ? "Creating..." : "Create company"}
              </button>
            </div>
          </form>
        </PageSection>
      ) : null}

      <PageSection eyebrow="List" title="Companies">
        {isLoading ? <p className="muted">Loading companies...</p> : null}
        {isError ? (
          <ErrorState
            message="Companies could not be loaded."
            onRetry={() => {
              void companiesQuery.refetch();
            }}
          />
        ) : null}
        {!isLoading && !isError && items.length === 0 ? (
          <EmptyState
            title={
              hasActiveFilters
                ? "No companies match this view"
                : "No companies yet"
            }
            message={
              hasActiveFilters
                ? "Adjust search or filters to broaden the company list."
                : "Create the first company under a client to begin organizing campaigns."
            }
          />
        ) : null}
        {!isLoading && !isError && items.length > 0 ? (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company name</th>
                  <th>Client</th>
                  <th>Status</th>
                  {canPlan ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <CompanyRow
                    key={item.id}
                    item={item}
                    canPlan={canPlan}
                    isEditing={editingCompanyId === item.id}
                    isDeleting={deleteMutation.isPending}
                    onEdit={() => setEditingCompanyId(item.id)}
                    onCancelEdit={() => setEditingCompanyId(null)}
                    onDelete={() => {
                      if (
                        !window.confirm(
                          `Delete company "${item.name}"? This cannot be undone.`,
                        )
                      ) {
                        return;
                      }
                      deleteMutation.mutate(item.id);
                    }}
                  />
                ))}
              </tbody>
            </table>
            {meta ? (
              <div className="list-pagination">
                <p className="muted">
                  Page {meta.page} of {meta.totalPages} · {meta.total}{" "}
                  companies
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
