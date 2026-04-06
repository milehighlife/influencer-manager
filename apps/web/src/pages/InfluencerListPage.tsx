import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Influencer } from "@influencer-manager/shared/types/mobile";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { PageSection } from "../components/PageSection";
import {
  useInfluencerListItems,
  useCreateInfluencerMutation,
  useCompaniesByClient,
} from "../hooks/use-influencer-manager";
import {
  useClientLookupQuery,
} from "../hooks/use-campaign-builder";

const PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "linkedin",
  "threads",
  "other",
] as const;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 24;

interface ListSearchState {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortDirection: string;
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
    sortBy: searchParams.get("sortBy") ?? "firstName",
    sortDirection: searchParams.get("sortDir") === "desc" ? "desc" : "asc",
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
  if (state.sortBy && state.sortBy !== "firstName") {
    next.set("sortBy", state.sortBy);
  }
  if (state.sortDirection !== "asc") {
    next.set("sortDir", state.sortDirection);
  }

  return next;
}

function SortableHeader({
  label,
  column,
  activeColumn,
  direction,
  onSort,
}: {
  label: string;
  column: string;
  activeColumn: string;
  direction: string;
  onSort: (column: string) => void;
}) {
  const active = activeColumn === column;
  return (
    <th className="sortable-th" onClick={() => onSort(column)}>
      {label}
      {active ? (
        <span className="sort-arrow sort-active">
          {direction === "asc" ? " \u25B2" : " \u25BC"}
        </span>
      ) : null}
    </th>
  );
}

const INFLUENCER_SORT_MAP: Record<string, string> = {
  firstName: "name",
  lastName: "name",
  client: "client",
  company: "company",
  rating: "rating_average",
};

function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) {
    return { firstName: trimmed, lastName: "" };
  }

  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1),
  };
}

function InfluencerRow({ item }: { item: Influencer }) {
  const { firstName, lastName } = splitName(item.name);

  return (
    <tr>
      <td><Link to={`/influencers/${item.id}`}>{firstName}</Link></td>
      <td><Link to={`/influencers/${item.id}`}>{lastName || "—"}</Link></td>
      <td>
        {item.clients && item.clients.length > 0
          ? item.clients.join(", ")
          : "—"}
      </td>
      <td>
        {item.companies && item.companies.length > 0
          ? item.companies.join(", ")
          : "—"}
      </td>
      <td>
        {item.rating_average != null ? item.rating_average.toFixed(1) : "—"}
      </td>
      <td>
        <Link className="secondary-button" to={`/influencers/${item.id}`} style={{ padding: "4px 12px", fontSize: 12 }}>
          Details
        </Link>
      </td>
    </tr>
  );
}

function CreateInfluencerForm({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateInfluencerMutation();
  const [createFormError, setCreateFormError] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    primaryPlatform: "instagram",
    location: "",
    clientId: "",
    clientName: "",
    companyIds: [] as string[],
  });

  const clientsQuery = useClientLookupQuery(clientSearch);
  const clientResults = clientsQuery.data?.data ?? [];

  const companiesByClientQuery = useCompaniesByClient(
    form.clientId || undefined,
  );
  const clientCompanies = companiesByClientQuery.data?.data ?? [];

  const visibleCreateError = createMutation.isError
    ? createMutation.error.message
    : createFormError;

  return (
    <PageSection eyebrow="Create" title="New influencer">
      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.firstName.trim()) {
            setCreateFormError("First name is required.");
            return;
          }
          setCreateFormError(null);
          const name =
            `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
          createMutation.mutate(
            {
              name,
              email: form.email || undefined,
              primary_platform: form.primaryPlatform,
              location: form.location || undefined,
            },
            {
              onSuccess: () => {
                onClose();
              },
            },
          );
        }}
      >
        <label className="field">
          <span>First name</span>
          <input
            value={form.firstName}
            onChange={(event) => {
              setCreateFormError(null);
              setForm((current) => ({
                ...current,
                firstName: event.target.value,
              }));
            }}
            required
          />
        </label>
        <label className="field">
          <span>Last name</span>
          <input
            value={form.lastName}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                lastName: event.target.value,
              }))
            }
          />
        </label>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
          />
        </label>
        <label className="field">
          <span>Primary platform</span>
          <select
            value={form.primaryPlatform}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                primaryPlatform: event.target.value,
              }))
            }
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Location</span>
          <input
            value={form.location}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                location: event.target.value,
              }))
            }
          />
        </label>
        <div className="field">
          <span>Client</span>
          {form.clientId ? (
            <div className="autocomplete-selected">
              {form.clientName}
              <button
                type="button"
                aria-label="Clear client"
                onClick={() => {
                  setForm((current) => ({
                    ...current,
                    clientId: "",
                    clientName: "",
                    companyIds: [],
                  }));
                  setClientSearch("");
                }}
              >
                ×
              </button>
            </div>
          ) : (
            <div className="autocomplete">
              <input
                type="search"
                value={clientSearch}
                placeholder="Type to search clients"
                onChange={(event) => {
                  setClientSearch(event.target.value);
                  setClientOpen(true);
                }}
                onFocus={() => setClientOpen(true)}
                onBlur={() => {
                  setTimeout(() => setClientOpen(false), 150);
                }}
              />
              {clientOpen && clientSearch.trim() && clientResults.length > 0 ? (
                <ul className="autocomplete-list" role="listbox">
                  {clientResults.map((client) => (
                    <li
                      key={client.id}
                      className="autocomplete-item"
                      role="option"
                      aria-selected={false}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setForm((current) => ({
                          ...current,
                          clientId: client.id,
                          clientName: client.name,
                          companyIds: [],
                        }));
                        setClientSearch("");
                        setClientOpen(false);
                      }}
                    >
                      {client.name}
                    </li>
                  ))}
                </ul>
              ) : null}
              {clientOpen && clientSearch.trim() && clientResults.length === 0 ? (
                <ul className="autocomplete-list">
                  <li className="autocomplete-item muted">No clients match "{clientSearch.trim()}"</li>
                </ul>
              ) : null}
            </div>
          )}
        </div>
        {form.clientId ? (
          <fieldset className="field" style={{ border: "none", margin: 0, padding: 0 }}>
            <legend style={{ fontWeight: 600, marginBottom: 8 }}>Companies</legend>
            {companiesByClientQuery.isLoading ? (
              <p className="muted">Loading companies...</p>
            ) : clientCompanies.length === 0 ? (
              <p className="muted">No companies for this client.</p>
            ) : (
              <div className="checkbox-list">
                {clientCompanies.map((company) => (
                  <label key={company.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={form.companyIds.includes(company.id)}
                      onChange={(event) => {
                        setForm((current) => ({
                          ...current,
                          companyIds: event.target.checked
                            ? [...current.companyIds, company.id]
                            : current.companyIds.filter((id) => id !== company.id),
                        }));
                      }}
                    />
                    {company.name}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        ) : null}
        {visibleCreateError ? (
          <p className="error-copy field-span-2">{visibleCreateError}</p>
        ) : null}
        <div className="field-span-2 form-actions">
          <button
            className="primary-button"
            type="submit"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create influencer"}
          </button>
        </div>
      </form>
    </PageSection>
  );
}

export function InfluencerListPage({ canPlan }: { canPlan: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const queryState = useMemo(
    () => parseSearchParams(searchParams),
    [searchParams],
  );
  const { page, limit, search, sortBy, sortDirection } = queryState;
  const apiSortBy = INFLUENCER_SORT_MAP[sortBy] ?? "name";
  const { items, meta, isLoading, isError, influencersQuery } =
    useInfluencerListItems({
      page,
      limit,
      search: search || undefined,
      sortBy: apiSortBy,
      sortDirection,
    });
  const hasActiveFilters = Boolean(search);

  function handleSort(column: string) {
    updateQueryState((current) => ({
      ...current,
      page: DEFAULT_PAGE,
      sortBy: column,
      sortDirection:
        current.sortBy === column && current.sortDirection === "asc"
          ? "desc"
          : "asc",
    }));
  }

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
          placeholder="Search influencers..."
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
            {showCreateForm ? "Close" : "New Influencer"}
          </button>
        ) : null}
      </div>

      {showCreateForm ? (
        <CreateInfluencerForm
          onClose={() => setShowCreateForm(false)}
        />
      ) : null}

      <PageSection eyebrow="List" title="Influencers">
        {isLoading ? <p className="muted">Loading influencers...</p> : null}
        {isError ? (
          <ErrorState
            message="Influencers could not be loaded."
            onRetry={() => {
              void influencersQuery.refetch();
            }}
          />
        ) : null}
        {!isLoading && !isError && items.length === 0 ? (
          <EmptyState
            title={
              hasActiveFilters
                ? "No influencers match this search"
                : "No influencers yet"
            }
            message={
              hasActiveFilters
                ? "Adjust search to broaden results."
                : "Add the first influencer to begin assigning them to campaign actions."
            }
          />
        ) : null}
        {!isLoading && !isError && items.length > 0 ? (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <SortableHeader label="First name" column="firstName" activeColumn={sortBy} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Last name" column="lastName" activeColumn={sortBy} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Client" column="client" activeColumn={sortBy} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Company" column="company" activeColumn={sortBy} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Rating" column="rating" activeColumn={sortBy} direction={sortDirection} onSort={handleSort} />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <InfluencerRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
            {meta ? (
              <div className="list-pagination">
                <p className="muted">
                  Page {meta.page} of {meta.totalPages} · {meta.total}{" "}
                  influencers
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
