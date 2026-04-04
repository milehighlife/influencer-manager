import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  CAMPAIGN_STATUSES,
} from "@influencer-manager/shared/types/mobile";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { PageSection } from "../components/PageSection";
import { StatusBadge } from "../components/StatusBadge";
import {
  getLookupHelperMessage,
  mergeLookupOptions,
  useCampaignListItems,
  useCampaignStatusCounts,
  useCreateCampaignMutation,
  useCompanyLookupQuery,
  useSelectedCompanyQuery,
} from "../hooks/use-campaign-builder";
import { validateCampaignSchedule } from "../utils/campaign-builder";
import { formatDate } from "../utils/format";

import type {
  CampaignPlannerSortField,
  SortDirection as SortDir,
} from "@influencer-manager/shared/types/mobile";

const CAMPAIGN_SORT_MAP: Record<string, CampaignPlannerSortField> = {
  campaign: "name",
  client: "client_name",
  company: "company_name",
  status: "status",
};

function CampaignSortableHeader({
  label,
  column,
  activeColumn,
  direction,
  onSort,
}: {
  label: string;
  column: string;
  activeColumn: string;
  direction: SortDir;
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

function statusTone(status: string): "neutral" | "info" | "primary" | "success" | "warning" | "danger" {
  if (status === "draft") return "neutral";
  if (status === "planned") return "primary";
  if (status === "active") return "success";
  if (status === "paused") return "danger";
  if (status === "completed") return "info";
  if (status === "archived") return "warning";
  return "neutral";
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

const FILTER_STATUSES = ["draft", "active", "completed", "archived"] as const;
const DEFAULT_STATUS_FILTER = "active";

interface PlannerListSearchState {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortDirection: SortDir;
  statusFilters: string[];
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

function parseStatusFilters(raw: string | null): string[] {
  if (raw === null) return [DEFAULT_STATUS_FILTER];
  if (raw === "") return [];
  return raw.split(",").filter((s) => s);
}

function parsePlannerListSearchParams(searchParams: URLSearchParams): PlannerListSearchState {
  return {
    page: parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE),
    limit: parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT),
    search: searchParams.get("search") ?? "",
    sortBy: searchParams.get("sortBy") ?? "campaign",
    sortDirection: (searchParams.get("sortDir") === "desc" ? "desc" : "asc") as SortDir,
    statusFilters: parseStatusFilters(searchParams.get("status")),
  };
}

function buildPlannerListSearchParams(state: PlannerListSearchState) {
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
  if (state.sortBy && state.sortBy !== "campaign") {
    next.set("sortBy", state.sortBy);
  }
  if (state.sortDirection !== "asc") {
    next.set("sortDir", state.sortDirection);
  }

  // Persist status filters — only omit when it's the default (just "active")
  const isDefault =
    state.statusFilters.length === 1 &&
    state.statusFilters[0] === DEFAULT_STATUS_FILTER;
  if (!isDefault) {
    next.set("status", state.statusFilters.join(","));
  }

  return next;
}

export function CampaignListPage({ canPlan }: { canPlan: boolean }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createCompanyLookupSearch, setCreateCompanyLookupSearch] = useState("");
  const createClientId = searchParams.get("clientId") || undefined;
  const [showCreateForm, setShowCreateForm] = useState(
    searchParams.get("create") === "1",
  );
  const plannerQueryState = useMemo(
    () => parsePlannerListSearchParams(searchParams),
    [searchParams],
  );
  const { page, limit, search, sortBy, sortDirection, statusFilters } =
    plannerQueryState;
  const apiSortBy = CAMPAIGN_SORT_MAP[sortBy] ?? "name";
  const statusCountsQuery = useCampaignStatusCounts();
  const statusCounts = statusCountsQuery.data ?? {};
  const { items, meta, isLoading, isError, campaignsQuery } = useCampaignListItems({
    page,
    limit,
    search: search || undefined,
    statuses: statusFilters.length > 0 ? statusFilters.join(",") : undefined,
    sortBy: apiSortBy,
    sortDirection,
  });

  function toggleStatusFilter(status: string) {
    updatePlannerQueryState((current) => {
      const next = current.statusFilters.includes(status)
        ? current.statusFilters.filter((s) => s !== status)
        : [...current.statusFilters, status];
      return { ...current, statusFilters: next, page: DEFAULT_PAGE };
    });
  }
  const createCampaignMutation = useCreateCampaignMutation();
  const [createFormError, setCreateFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    companyId: "",
    name: "",
    description: "",
    campaignType: "product_launch",
    status: "draft",
    startDate: "",
    endDate: "",
    budget: "",
  });
  const createCompaniesQuery = useCompanyLookupQuery(createCompanyLookupSearch, createClientId);
  const selectedCreateCompanyQuery = useSelectedCompanyQuery(form.companyId || undefined);
  const createScheduleValidationError = validateCampaignSchedule({
    startDate: form.startDate,
    endDate: form.endDate,
  });
  const visibleCreateError =
    createCampaignMutation.isError
      ? createCampaignMutation.error.message
      : createFormError ?? createScheduleValidationError;

  const createCompanyOptions = useMemo(
    () =>
      mergeLookupOptions(
        selectedCreateCompanyQuery.data ?? null,
        createCompaniesQuery.data?.data ?? [],
      ),
    [createCompaniesQuery.data?.data, selectedCreateCompanyQuery.data],
  );
  function handleCampaignSort(column: string) {
    updatePlannerQueryState((current) => ({
      ...current,
      page: DEFAULT_PAGE,
      sortBy: column,
      sortDirection:
        current.sortBy === column && current.sortDirection === "asc"
          ? "desc"
          : "asc",
    }));
  }
  const hasActiveQueryFilters = Boolean(search) || statusFilters.length > 0;
  const noFiltersSelected = statusFilters.length === 0;
  const createCompanyLookupHelper = createClientId
    ? `Showing ${createCompaniesQuery.data?.data.length ?? 0} companies for this client.`
    : getLookupHelperMessage({
        searchTerm: createCompanyLookupSearch,
        subject: "companies",
        count: createCompaniesQuery.data?.data.length ?? 0,
      });

  function updatePlannerQueryState(
    updater:
      | Partial<PlannerListSearchState>
      | ((current: PlannerListSearchState) => PlannerListSearchState),
  ) {
    const current = parsePlannerListSearchParams(searchParams);
    const next =
      typeof updater === "function"
        ? updater(current)
        : {
            ...current,
            ...updater,
          };

    setSearchParams(buildPlannerListSearchParams(next));
  }

  return (
    <div className="page-stack">
      <div className="search-bar-row">
        <input
          className="search-bar-input"
          type="search"
          value={search}
          placeholder="Search campaigns..."
          onChange={(event) => {
            updatePlannerQueryState({
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
            {showCreateForm ? "Close" : "Create Campaign"}
          </button>
        ) : null}
      </div>

      {showCreateForm ? (
        <PageSection eyebrow="Create" title="New campaign">
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              if (!form.companyId) {
                setCreateFormError("Select a company before creating a campaign.");
                return;
              }
              if (createScheduleValidationError) {
                setCreateFormError(createScheduleValidationError);
                return;
              }
              setCreateFormError(null);
              createCampaignMutation.mutate({
                companyId: form.companyId,
                payload: {
                  name: form.name,
                  description: form.description || undefined,
                  campaign_type: form.campaignType,
                  status: form.status as typeof CAMPAIGN_STATUSES[number],
                  start_date: form.startDate || undefined,
                  end_date: form.endDate || undefined,
                  budget: form.budget ? Number(form.budget) : undefined,
                },
              }, {
                onSuccess: (campaign) => {
                  setForm({
                    companyId: "",
                    name: "",
                    description: "",
                    campaignType: "product_launch",
                    status: "draft",
                    startDate: "",
                    endDate: "",
                    budget: "",
                  });
                  setShowCreateForm(false);
                  setCreateFormError(null);
                  void navigate(`/campaigns/${campaign.id}`);
                },
              });
            }}
          >
            <label className="field">
              <span>Company lookup</span>
              <div className="field-input-stack">
                <input
                  type="search"
                  value={createCompanyLookupSearch}
                  placeholder="Type to search companies"
                  onChange={(event) => setCreateCompanyLookupSearch(event.target.value)}
                />
                <select
                  value={form.companyId}
                  onChange={(event) => {
                    setCreateFormError(null);
                    setForm((current) => ({ ...current, companyId: event.target.value }));
                  }}
                >
                  <option value="">Select company</option>
                  {createCompanyOptions.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="muted field-helper-text">{createCompanyLookupHelper}</p>
            </label>
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
              <span>Campaign type</span>
              <input
                value={form.campaignType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    campaignType: event.target.value,
                  }))
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
                {CAMPAIGN_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Start date</span>
              <input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, startDate: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>End date</span>
              <input
                type="date"
                value={form.endDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, endDate: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Budget</span>
              <input
                type="number"
                min="0"
                value={form.budget}
                onChange={(event) =>
                  setForm((current) => ({ ...current, budget: event.target.value }))
                }
              />
            </label>
            {visibleCreateError ? (
              <p className="error-copy field-span-2">{visibleCreateError}</p>
            ) : null}
            <div className="field-span-2 form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={
                  createCampaignMutation.isPending ||
                  Boolean(createScheduleValidationError)
                }
              >
                {createCampaignMutation.isPending ? "Creating..." : "Create campaign"}
              </button>
            </div>
          </form>
        </PageSection>
      ) : null}

      <PageSection eyebrow="List" title="Campaigns">
        <div className="status-filter-bar">
          {FILTER_STATUSES.map((status) => {
            const isOn = statusFilters.includes(status);
            const count = statusCounts[status] ?? 0;
            return (
              <button
                key={status}
                type="button"
                className={`status-filter-chip ${isOn ? "status-filter-chip-active" : ""} status-filter-chip-${status}`}
                onClick={() => toggleStatusFilter(status)}
              >
                {status}
                <span className="status-filter-count">{count}</span>
              </button>
            );
          })}
        </div>

        {noFiltersSelected ? (
          <EmptyState
            title="No status filters selected"
            message="Toggle at least one status filter above to view campaigns."
          />
        ) : null}
        {!noFiltersSelected && isLoading ? <p className="muted">Loading campaigns...</p> : null}
        {!noFiltersSelected && isError ? (
          <ErrorState
            message="Campaigns could not be loaded."
            onRetry={() => {
              void campaignsQuery.refetch();
            }}
          />
        ) : null}
        {!noFiltersSelected && !isLoading && !isError && items.length === 0 ? (
          <EmptyState
            title={
              hasActiveQueryFilters
                ? "No campaigns match this view"
                : "No campaigns yet"
            }
            message={
              hasActiveQueryFilters
                ? "Adjust search or filters to broaden the campaign list."
                : "Create the first campaign to begin building missions, actions, and influencer assignments."
            }
          />
        ) : null}
        {!noFiltersSelected && !isLoading && !isError && items.length > 0 ? (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <CampaignSortableHeader label="Campaign" column="campaign" activeColumn={sortBy} direction={sortDirection} onSort={handleCampaignSort} />
                  <CampaignSortableHeader label="Client" column="client" activeColumn={sortBy} direction={sortDirection} onSort={handleCampaignSort} />
                  <CampaignSortableHeader label="Company" column="company" activeColumn={sortBy} direction={sortDirection} onSort={handleCampaignSort} />
                  <CampaignSortableHeader label="Status" column="status" activeColumn={sortBy} direction={sortDirection} onSort={handleCampaignSort} />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link to={`/campaigns/${item.id}`}>{item.name}</Link>
                    </td>
                    <td>{item.company.client_name ?? "—"}</td>
                    <td>{item.company.name}</td>
                    <td>
                      <StatusBadge
                        label={item.status}
                        tone={statusTone(item.status)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meta ? (
              <div className="list-pagination">
                <p className="muted">
                  Page {meta.page} of {meta.totalPages} · {meta.total} campaigns
                </p>
                <div className="inline-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      updatePlannerQueryState((current) => ({
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
                      updatePlannerQueryState((current) => ({
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
                <div className="page-size-options">
                  <span className="muted">Show:</span>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <button
                      key={size}
                      className={`page-size-button ${limit === size ? "page-size-active" : ""}`}
                      type="button"
                      onClick={() =>
                        updatePlannerQueryState({
                          limit: size,
                          page: DEFAULT_PAGE,
                        })
                      }
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </PageSection>
    </div>
  );
}
