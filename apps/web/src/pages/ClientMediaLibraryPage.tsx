import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ASSET_CATEGORIES,
  ASSET_SOURCE_TYPES,
} from "@influencer-manager/shared/types/mobile";
import type { ClientAssetListParams } from "@influencer-manager/shared/types/mobile";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { MediaLibrary } from "../components/MediaLibrary";
import { PageSection } from "../components/PageSection";
import { useClientAssets } from "../hooks/use-campaign-assets";
import {
  useClientCompanies,
  useClientCampaigns,
} from "../hooks/use-client-manager";

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

function formatFileSize(bytes: number | null | undefined) {
  if (bytes == null || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatCategoryLabel(category: string) {
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ClientMediaLibraryPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<"" | "upload" | "external_link">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(DEFAULT_PAGE);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const { items: companies } = useClientCompanies(clientId);
  const { items: campaigns } = useClientCampaigns(clientId);

  const filteredCampaigns = useMemo(() => {
    if (!companyFilter) return campaigns;
    return campaigns.filter((c) => c.company_id === companyFilter);
  }, [campaigns, companyFilter]);

  const params = useMemo<ClientAssetListParams>(() => {
    const p: ClientAssetListParams = { page, limit };
    if (debouncedSearch) p.search = debouncedSearch;
    if (companyFilter) p.company_id = companyFilter;
    if (campaignFilter) p.campaign_id = campaignFilter;
    if (categoryFilters.length > 0) p.category = categoryFilters.join(",");
    if (sourceFilter) p.source_type = sourceFilter;
    if (startDate) p.start_date = startDate;
    if (endDate) p.end_date = endDate;
    return p;
  }, [debouncedSearch, companyFilter, campaignFilter, categoryFilters, sourceFilter, startDate, endDate, page, limit]);

  const { assets, meta, summary, isLoading, isError, query } = useClientAssets(clientId, params);

  if (!clientId) {
    return <EmptyState title="Client missing" message="Select a client to view their media library." />;
  }

  function toggleCategory(cat: string) {
    setCategoryFilters((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
    setPage(DEFAULT_PAGE);
  }

  return (
    <div className="page-stack">
      <Link className="breadcrumb-link" to={`/clients/${clientId}`}>
        &lt; Back to client
      </Link>

      <PageSection eyebrow="Client" title="Media Library">
        {summary ? (
          <div className="detail-summary-grid" style={{ marginBottom: 16 }}>
            <div>
              <p className="muted">Total assets</p>
              <strong>{summary.total_assets}</strong>
            </div>
            <div>
              <p className="muted">Total file size</p>
              <strong>{formatFileSize(summary.total_file_size)}</strong>
            </div>
          </div>
        ) : null}

        <div className="search-bar-row" style={{ marginBottom: 12 }}>
          <input
            className="search-bar-input"
            type="search"
            value={search}
            placeholder="Search assets..."
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="status-filter-bar" style={{ marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <label className="field" style={{ minWidth: 140 }}>
            <span>Company</span>
            <select value={companyFilter} onChange={(e) => { setCompanyFilter(e.target.value); setCampaignFilter(""); setPage(DEFAULT_PAGE); }}>
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className="field" style={{ minWidth: 140 }}>
            <span>Campaign</span>
            <select value={campaignFilter} onChange={(e) => { setCampaignFilter(e.target.value); setPage(DEFAULT_PAGE); }}>
              <option value="">All campaigns</option>
              {filteredCampaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className="field" style={{ minWidth: 120 }}>
            <span>Source</span>
            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value as "" | "upload" | "external_link"); setPage(DEFAULT_PAGE); }}
            >
              <option value="">All</option>
              {ASSET_SOURCE_TYPES.map((st) => (
                <option key={st} value={st}>
                  {st === "upload" ? "Uploads" : "Links"}
                </option>
              ))}
            </select>
          </label>

          <label className="field" style={{ minWidth: 120 }}>
            <span>Start date</span>
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(DEFAULT_PAGE); }} />
          </label>

          <label className="field" style={{ minWidth: 120 }}>
            <span>End date</span>
            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(DEFAULT_PAGE); }} />
          </label>
        </div>

        <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 4 }}>
          {ASSET_CATEGORIES.map((cat) => {
            const isOn = categoryFilters.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                className={`status-filter-chip ${isOn ? "status-filter-chip-active" : ""}`}
                onClick={() => toggleCategory(cat)}
              >
                {formatCategoryLabel(cat)}
              </button>
            );
          })}
        </div>

        {isError ? (
          <ErrorState
            message="Assets could not be loaded."
            onRetry={() => { void query.refetch(); }}
          />
        ) : null}

        {!isError ? (
          <MediaLibrary
            assets={assets}
            isLoading={isLoading}
            isReadOnly
            showCampaignName
            showCompanyName
            onRefresh={() => { void query.refetch(); }}
          />
        ) : null}

        {meta && meta.totalPages > 0 ? (
          <div className="list-pagination" style={{ marginTop: 16 }}>
            <p className="muted">
              Page {meta.page} of {meta.totalPages} · {meta.total} assets
            </p>
            <div className="inline-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setPage((p) => Math.max(DEFAULT_PAGE, p - 1))}
                disabled={meta.page <= 1}
              >
                Previous
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setPage((p) => (meta.totalPages > p ? p + 1 : p))}
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
                  onClick={() => { setLimit(size); setPage(DEFAULT_PAGE); }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </PageSection>
    </div>
  );
}
