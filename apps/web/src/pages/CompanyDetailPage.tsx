import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Company } from "@influencer-manager/shared/types/mobile";

import { AddExternalLinkDialog } from "../components/AddExternalLinkDialog";
import { AssetUploadZone } from "../components/AssetUploadZone";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { MediaLibrary } from "../components/MediaLibrary";
import { PageSection } from "../components/PageSection";
import { PriorityRegionMap } from "../components/PriorityRegionMap";
import { useClientAssets } from "../hooks/use-campaign-assets";
import { companiesApi, influencersApi, campaignAssetsApi, type UpdateCompanyPayload } from "../services/api";
import { useAuthStore } from "../state/auth-store";

const PLATFORM_FIELDS = [
  { key: "priority_instagram", label: "Instagram" },
  { key: "priority_tiktok", label: "TikTok" },
  { key: "priority_youtube", label: "YouTube" },
  { key: "priority_facebook", label: "Facebook" },
  { key: "priority_x", label: "X" },
  { key: "priority_linkedin", label: "LinkedIn" },
  { key: "priority_threads", label: "Threads" },
] as const;

function useCompanyQuery(companyId?: string) {
  return useQuery({
    queryKey: ["web", "companies", companyId],
    queryFn: () => companiesApi.get(companyId!),
    enabled: Boolean(companyId),
  });
}

function useUpdateCompanyMutation(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCompanyPayload) =>
      companiesApi.update(companyId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["web", "companies"] });
    },
  });
}

export function CompanyDetailPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const companyQuery = useCompanyQuery(companyId);
  const company = companyQuery.data ?? null;

  if (companyQuery.isLoading) {
    return <p className="muted" style={{ padding: 32 }}>Loading company...</p>;
  }

  if (companyQuery.isError || !company) {
    return (
      <div style={{ padding: 32 }}>
        <ErrorState
          message="Company could not be loaded."
          onRetry={() => { void companyQuery.refetch(); }}
        />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <Link className="breadcrumb-link" to={`/clients/${company.client_id}`}>
        &lt; {company.client_name ?? "Client"}
      </Link>

      <CompanyEditor company={company} />
    </div>
  );
}

function usePlatformInfluencerCounts(clientId: string) {
  const platforms = ["instagram", "tiktok", "youtube", "facebook", "x", "linkedin", "threads"];

  return useQuery({
    queryKey: ["web", "companies", "platform-counts", clientId],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        platforms.map(async (p) => {
          const result = await influencersApi.listByClientAndPlatform(clientId, p);
          counts[p] = result.length;
        }),
      );
      return counts;
    },
    enabled: Boolean(clientId),
  });
}

type InfSortCol = "name" | "location" | "rating";

function CompanyInfluencersSection({ companyId }: { companyId: string }) {
  const query = useQuery({
    queryKey: ["web", "companies", companyId, "influencers"],
    queryFn: () => companiesApi.getInfluencers(companyId),
  });
  const items = query.data ?? [];
  const [sortCol, setSortCol] = useState<InfSortCol>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function handleSort(col: InfSortCol) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  }

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...items].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortCol) {
        case "name":
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
          break;
        case "location":
          av = [a.city, a.state].filter(Boolean).join(", ").toLowerCase();
          bv = [b.city, b.state].filter(Boolean).join(", ").toLowerCase();
          break;
        case "rating":
          av = a.rating_average ?? -1;
          bv = b.rating_average ?? -1;
          break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [items, sortCol, sortDir]);

  function SortTh({ label, col }: { label: string; col: InfSortCol }) {
    const active = sortCol === col;
    return (
      <th className="sortable-th" onClick={() => handleSort(col)}>
        {label}
        {active ? (
          <span className="sort-arrow sort-active">
            {sortDir === "asc" ? " \u25B2" : " \u25BC"}
          </span>
        ) : null}
      </th>
    );
  }

  return (
    <PageSection eyebrow="Influencers" title="Campaign influencers">
      {query.isLoading ? <p className="muted">Loading...</p> : null}
      {query.isError ? (
        <ErrorState message="Could not load influencers." onRetry={() => { void query.refetch(); }} />
      ) : null}
      {!query.isLoading && !query.isError && items.length === 0 ? (
        <EmptyState title="No influencers" message="No influencers are assigned to active or completed campaigns for this company." />
      ) : null}
      {!query.isLoading && !query.isError && items.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <SortTh label="Name" col="name" />
              <SortTh label="Location" col="location" />
              <SortTh label="Rating" col="rating" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((inf) => (
              <tr key={inf.id}>
                <td><Link to={`/influencers/${inf.id}`}>{inf.name}</Link></td>
                <td>{[inf.city, inf.state].filter(Boolean).join(", ") || "—"}</td>
                <td>{inf.rating_average != null ? inf.rating_average.toFixed(1) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </PageSection>
  );
}

function CompanyEditor({ company }: { company: Company }) {
  const [editing, setEditing] = useState(false);
  const [editingPlatforms, setEditingPlatforms] = useState(false);
  const mutation = useUpdateCompanyMutation(company.id);
  const platformCounts = usePlatformInfluencerCounts(company.client_id);
  const counts = platformCounts.data ?? {};
  const [form, setForm] = useState({
    name: company.name,
    contact_first_name: company.contact_first_name ?? "",
    contact_last_name: company.contact_last_name ?? "",
    contact_email: company.contact_email ?? "",
    contact_phone: company.contact_phone ?? "",
    priority_instagram: company.priority_instagram,
    priority_tiktok: company.priority_tiktok,
    priority_youtube: company.priority_youtube,
    priority_facebook: company.priority_facebook,
    priority_x: company.priority_x,
    priority_linkedin: company.priority_linkedin,
    priority_threads: company.priority_threads,
  });
  const [saved, setSaved] = useState(false);
  const user = useAuthStore((s) => s.user);

  function handleSave() {
    setSaved(false);
    mutation.mutate(
      {
        name: form.name,
        contact_first_name: form.contact_first_name || null,
        contact_last_name: form.contact_last_name || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
      },
      { onSuccess: () => { setSaved(true); setEditing(false); } },
    );
  }

  return (
    <>
      <PageSection
        eyebrow="Company"
        title={company.name}
        actions={
          <button
            className="primary-button"
            type="button"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Close" : "Edit"}
          </button>
        }
      >
        {editing ? (
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <label className="field">
              <span>Company name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span>Contact first name</span>
              <input
                value={form.contact_first_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_first_name: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Contact last name</span>
              <input
                value={form.contact_last_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_last_name: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Phone</span>
              <input
                type="tel"
                value={form.contact_phone}
                onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
              />
            </label>
            <div className="field-span-2 form-actions">
              <button className="primary-button" type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        ) : (
          <div className="detail-fields">
            <div className="detail-field">
              <span className="detail-label">Contact</span>
              <span>{[company.contact_first_name, company.contact_last_name].filter(Boolean).join(" ") || "—"}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Email</span>
              <span>{company.contact_email ?? "—"}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Phone</span>
              <span>{company.contact_phone ?? "—"}</span>
            </div>
          </div>
        )}
      </PageSection>

      <PageSection
        eyebrow="Platforms"
        title="Platform priorities"
        actions={
          <button
            className="primary-button"
            type="button"
            onClick={() => setEditingPlatforms((v) => !v)}
          >
            {editingPlatforms ? "Close" : "Edit"}
          </button>
        }
      >
        <p className="muted" style={{ fontSize: 12, margin: "0 0 12px" }}>0 = none, 10 = very high</p>
        <div className="platform-sliders">
          {(() => {
            const totalAcross = Object.values(counts).reduce((a, b) => a + b, 0);
            const maxPriority = Math.max(...PLATFORM_FIELDS.map(({ key }) => form[key]), 1);

            return PLATFORM_FIELDS.map(({ key, label }) => {
            const platform = key.replace("priority_", "");
            const count = counts[platform] ?? 0;
            const pct = totalAcross > 0 ? Math.round((count / totalAcross) * 100) : 0;
            const priority = form[key];

            // Normalize both to 0-1 scale
            const priorityNorm = priority / 10;
            const supplyNorm = totalAcross > 0 ? count / Math.max(...Object.values(counts), 1) : 0;

            // Calculate alignment: how well supply matches priority
            // Gap = priority demand minus relative supply (both 0-1)
            let healthTone: "green" | "yellow" | "red" | "neutral" | "overage" | "neutral-overage";
            if (priority === 0) {
              healthTone = count > 0 ? "neutral-overage" : "neutral";
            } else {
              const gap = priorityNorm - supplyNorm;
              if (gap < -0.1) healthTone = "overage";       // supply significantly exceeds priority
              else if (gap <= 0.1) healthTone = "green";     // supply matches priority
              else if (gap <= 0.35) healthTone = "yellow";   // moderate gap
              else healthTone = "red";                        // significant gap
            }

            const healthColor =
              healthTone === "green" ? "#059669"
              : healthTone === "yellow" ? "#d97706"
              : healthTone === "red" ? "#dc2626"
              : healthTone === "overage" ? "#059669"
              : "transparent";

            return (
              <div key={key} className="slider-row">
                <label className="slider-label">{label}</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={form[key]}
                  disabled={!editingPlatforms}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: Number(e.target.value) }))
                  }
                  className="slider-input"
                />
                <span className="slider-value">{form[key]}</span>
                <span className="muted" style={{ fontSize: 13, minWidth: 110 }}>
                  {count} influencer{count !== 1 ? "s" : ""} ({pct}%)
                </span>
                <span className="platform-health-cell">
                  {healthTone === "overage" ? (
                    <span
                      style={{ color: healthColor, fontSize: 16, fontWeight: 700, lineHeight: 1 }}
                      title="Overage: more supply than priority needs"
                    >&#9660;</span>
                  ) : healthTone === "neutral-overage" ? (
                    <span
                      className="platform-health-arrow-neutral"
                      title="No priority set but influencers available"
                    >&#9660;</span>
                  ) : (
                    <span
                      className={`platform-health-dot ${healthTone === "neutral" ? "platform-health-neutral" : ""}`}
                      style={healthTone !== "neutral" ? { background: healthColor } : undefined}
                      title={
                        healthTone === "green" ? "Supply matches priority"
                        : healthTone === "yellow" ? "Moderate supply gap"
                        : healthTone === "red" ? "Low supply for this priority"
                        : "No priority set"
                      }
                    />
                  )}
                </span>
              </div>
            );
          });
          })()}
        </div>

        {mutation.isError ? (
          <p className="error-copy" style={{ marginTop: 12 }}>{mutation.error.message}</p>
        ) : null}
        {saved ? (
          <p style={{ color: "var(--color-success)", marginTop: 12 }}>Saved successfully.</p>
        ) : null}

        {company.priorities_updated_by || company.priorities_updated_at ? (
          <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
            Updated by {company.priorities_updated_by ?? "—"}
            {company.priorities_updated_at
              ? ` on ${new Date(company.priorities_updated_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}`
              : ""}
          </p>
        ) : null}

        <div className="inline-actions" style={{ marginTop: 16 }}>
          {editingPlatforms ? (
            <button
              className="primary-button"
              type="button"
              disabled={mutation.isPending}
              onClick={() => {
                setSaved(false);
                mutation.mutate(
                  {
                    priority_instagram: form.priority_instagram,
                    priority_tiktok: form.priority_tiktok,
                    priority_youtube: form.priority_youtube,
                    priority_facebook: form.priority_facebook,
                    priority_x: form.priority_x,
                    priority_linkedin: form.priority_linkedin,
                    priority_threads: form.priority_threads,
                    priorities_updated_at: new Date().toISOString(),
                    priorities_updated_by: user?.fullName ?? "Admin",
                  },
                  { onSuccess: () => { setSaved(true); setEditingPlatforms(false); } },
                );
              }}
            >
              {mutation.isPending ? "Saving..." : "Save"}
            </button>
          ) : null}
        </div>
      </PageSection>

      <PageSection eyebrow="Markets" title="Activation regions">
        <PriorityRegionMap companyId={company.id} />
      </PageSection>

      <CompanyInfluencersSection companyId={company.id} />

      <CompanyMediaSection clientId={company.client_id} companyId={company.id} />
    </>
  );
}

function CompanyMediaSection({
  clientId,
  companyId,
}: {
  clientId: string;
  companyId: string;
}) {
  const { assets, isLoading, query } = useClientAssets(clientId, {
    company_id: companyId,
    limit: 100,
  });
  const queryClient = useQueryClient();
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [uploadCampaignId, setUploadCampaignId] = useState("");

  // We need a campaign ID to create assets — fetch campaigns for this company
  const campaignsQuery = useQuery({
    queryKey: ["web", "company-campaigns", companyId],
    queryFn: () =>
      companiesApi.get(companyId).then(async (co) => {
        const { campaignsApi } = await import("../services/api/campaigns");
        const res = await campaignsApi.listPlanner({
          company_id: companyId,
          limit: 100,
        });
        return res.data;
      }),
  });
  const campaigns = campaignsQuery.data ?? [];

  const selectedCampaignId = uploadCampaignId || (campaigns.length > 0 ? campaigns[0].id : "");

  async function handleUploadCreate(payload: {
    name: string;
    source_type: string;
    file_url: string;
    file_name: string;
    file_size_bytes: number;
    mime_type: string;
    category: string;
    thumbnail_url?: string;
  }) {
    if (!selectedCampaignId) return;
    await campaignAssetsApi.create(selectedCampaignId, payload);
    await queryClient.invalidateQueries({ queryKey: ["web", "client-assets"] });
  }

  function handleLinkSubmit(payload: {
    name: string;
    description?: string;
    source_type: string;
    file_url: string;
    category: string;
    tags: string[];
  }) {
    if (!selectedCampaignId) return;
    campaignAssetsApi.create(selectedCampaignId, payload).then(() => {
      setShowLinkDialog(false);
      void queryClient.invalidateQueries({ queryKey: ["web", "client-assets"] });
    });
  }

  async function handleDelete(asset: { id: string; campaign_id: string }) {
    await campaignAssetsApi.remove(asset.campaign_id, asset.id);
    await queryClient.invalidateQueries({ queryKey: ["web", "client-assets"] });
  }

  return (
    <PageSection eyebrow="Assets" title="Media">
      <div style={{ marginBottom: 16 }}>
        {campaigns.length > 1 ? (
          <label className="field" style={{ maxWidth: 300, marginBottom: 12 }}>
            <span>Upload to campaign</span>
            <select
              value={selectedCampaignId}
              onChange={(e) => setUploadCampaignId(e.target.value)}
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        <AssetUploadZone onCreate={handleUploadCreate} />
        <div style={{ marginTop: 8 }}>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setShowLinkDialog(true)}
          >
            Add External Link
          </button>
        </div>
      </div>

      <MediaLibrary
        assets={assets}
        isLoading={isLoading}
        isReadOnly={false}
        showCampaignName
        onRefresh={() => { void query.refetch(); }}
        onDelete={handleDelete}
      />

      {showLinkDialog ? (
        <AddExternalLinkDialog
          onSubmit={handleLinkSubmit}
          onClose={() => setShowLinkDialog(false)}
          isPending={false}
        />
      ) : null}
    </PageSection>
  );
}
