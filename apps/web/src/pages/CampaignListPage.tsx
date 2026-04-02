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
  useCreateCampaignMutation,
  useCompanyLookupQuery,
  useSelectedCompanyQuery,
} from "../hooks/use-campaign-builder";
import { validateCampaignSchedule } from "../utils/campaign-builder";
import { formatDate } from "../utils/format";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const DEFAULT_SORT_BY = "updated_at" as const;
const DEFAULT_SORT_DIRECTION = "desc" as const;

interface PlannerListSearchState {
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

function parsePlannerListSearchParams(searchParams: URLSearchParams): PlannerListSearchState {
  return {
    page: parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE),
    limit: parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT),
    search: searchParams.get("search") ?? "",
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

  return next;
}

export function CampaignListPage({ canPlan }: { canPlan: boolean }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createCompanyLookupSearch, setCreateCompanyLookupSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const plannerQueryState = useMemo(
    () => parsePlannerListSearchParams(searchParams),
    [searchParams],
  );
  const { page, limit, search } = plannerQueryState;
  const { items, meta, isLoading, isError, campaignsQuery } = useCampaignListItems({
    page,
    limit,
    search: search || undefined,
    sortBy: DEFAULT_SORT_BY,
    sortDirection: DEFAULT_SORT_DIRECTION,
  });
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
  const createCompaniesQuery = useCompanyLookupQuery(createCompanyLookupSearch);
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
  const hasActiveQueryFilters = Boolean(search);
  const createCompanyLookupHelper = getLookupHelperMessage({
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
        {isLoading ? <p className="muted">Loading campaigns...</p> : null}
        {isError ? (
          <ErrorState
            message="Campaigns could not be loaded."
            onRetry={() => {
              void campaignsQuery.refetch();
            }}
          />
        ) : null}
        {!isLoading && !isError && items.length === 0 ? (
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
        {!isLoading && !isError && items.length > 0 ? (
          <>
            <div className="list-grid">
              {items.map((item) => (
                <Link className="list-card" key={item.id} to={`/campaigns/${item.id}`}>
                  <div className="list-card-header">
                    <div>
                      <h3>{item.name}</h3>
                      <p className="muted">
                        {item.company.name}
                        {item.company.client_name ? ` · ${item.company.client_name}` : ""}
                      </p>
                    </div>
                    <StatusBadge
                      label={item.status}
                      tone={item.status === "active" ? "success" : "info"}
                    />
                  </div>
                  <div className="meta-grid">
                    <span>Start: {formatDate(item.start_date)}</span>
                    <span>End: {formatDate(item.end_date)}</span>
                    <span>Missions: {item.mission_count}</span>
                    <span>
                      Scheduled: {item.scheduled_mission_count}/{item.mission_count}
                    </span>
                  </div>
                  {item.partial_mission_count > 0 || item.unscheduled_mission_count > 0 ? (
                    <p className="muted">
                      {item.partial_mission_count > 0
                        ? `${item.partial_mission_count} partial`
                        : "0 partial"}{" "}
                      · {item.unscheduled_mission_count} unscheduled
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
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
              </div>
            ) : null}
          </>
        ) : null}
      </PageSection>
    </div>
  );
}
