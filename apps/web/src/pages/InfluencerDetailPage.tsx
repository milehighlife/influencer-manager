import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { PageSection } from "../components/PageSection";
import { StatusBadge } from "../components/StatusBadge";
import {
  useInfluencerAssignments,
  useInfluencerClients,
  useAddInfluencerClientMutation,
  useRemoveInfluencerClientMutation,
  useInfluencerOverallRating,
  useUpdateInfluencerMutation,
} from "../hooks/use-influencer-manager";
import { useClientLookupQuery } from "../hooks/use-campaign-builder";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusTone(status: string): "info" | "success" | "warning" | "danger" {
  if (status === "active") return "success";
  if (status === "completed") return "info";
  if (status === "archived") return "warning";
  if (status === "paused" || status === "draft") return "danger";
  return "info";
}

interface CampaignRow {
  campaignId: string;
  campaignName: string;
  clientName: string;
  companyName: string;
  campaignStatus: string;
  publishedActions: number;
  totalActions: number;
}

function InfluencerEditForm({
  influencer,
  onClose,
}: {
  influencer: { id: string; name: string; email: string | null; phone: string | null; mailing_address: string | null; city: string | null; state: string | null; zip: string | null };
  onClose: () => void;
}) {
  const updateMutation = useUpdateInfluencerMutation(influencer.id);
  const [form, setForm] = useState({
    name: influencer.name,
    email: influencer.email ?? "",
    phone: influencer.phone ?? "",
    mailing_address: influencer.mailing_address ?? "",
    city: influencer.city ?? "",
    state: influencer.state ?? "",
    zip: influencer.zip ?? "",
  });

  return (
    <form
      className="form-grid compact-form"
      style={{ marginTop: 16 }}
      onSubmit={(e) => {
        e.preventDefault();
        updateMutation.mutate(
          {
            name: form.name,
            email: form.email || null,
            phone: form.phone || null,
            mailing_address: form.mailing_address || null,
            city: form.city || null,
            state: form.state || null,
            zip: form.zip || null,
          },
          { onSuccess: onClose },
        );
      }}
    >
      <label className="field">
        <span>Name</span>
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
      </label>
      <label className="field">
        <span>Email</span>
        <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
      </label>
      <label className="field">
        <span>Phone</span>
        <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
      </label>
      <label className="field field-span-2">
        <span>Mailing Address</span>
        <input value={form.mailing_address} onChange={(e) => setForm((f) => ({ ...f, mailing_address: e.target.value }))} />
      </label>
      <label className="field">
        <span>City</span>
        <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
      </label>
      <label className="field">
        <span>State</span>
        <input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
      </label>
      <label className="field">
        <span>Zip</span>
        <input value={form.zip} onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))} />
      </label>
      {updateMutation.isError ? (
        <p className="error-copy field-span-2">{updateMutation.error.message}</p>
      ) : null}
      <div className="field-span-2 form-actions inline-actions">
        <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
        <button className="primary-button" type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

function PlatformsEditForm({
  influencer,
  onClose,
}: {
  influencer: { id: string; url_instagram: string | null; url_tiktok: string | null; url_facebook: string | null; url_youtube: string | null; url_linkedin: string | null; url_x: string | null; url_threads: string | null };
  onClose: () => void;
}) {
  const mutation = useUpdateInfluencerMutation(influencer.id);
  const [form, setForm] = useState({
    url_instagram: influencer.url_instagram ?? "",
    url_tiktok: influencer.url_tiktok ?? "",
    url_facebook: influencer.url_facebook ?? "",
    url_youtube: influencer.url_youtube ?? "",
    url_linkedin: influencer.url_linkedin ?? "",
    url_x: influencer.url_x ?? "",
    url_threads: influencer.url_threads ?? "",
  });

  return (
    <form
      className="form-grid compact-form"
      style={{ marginTop: 16 }}
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(
          {
            url_instagram: form.url_instagram || null,
            url_tiktok: form.url_tiktok || null,
            url_facebook: form.url_facebook || null,
            url_youtube: form.url_youtube || null,
            url_linkedin: form.url_linkedin || null,
            url_x: form.url_x || null,
            url_threads: form.url_threads || null,
          },
          { onSuccess: onClose },
        );
      }}
    >
      <label className="field">
        <span>Instagram URL</span>
        <input type="url" value={form.url_instagram} placeholder="https://instagram.com/..." onChange={(e) => setForm((f) => ({ ...f, url_instagram: e.target.value }))} />
      </label>
      <label className="field">
        <span>TikTok URL</span>
        <input type="url" value={form.url_tiktok} placeholder="https://tiktok.com/..." onChange={(e) => setForm((f) => ({ ...f, url_tiktok: e.target.value }))} />
      </label>
      <label className="field">
        <span>Facebook URL</span>
        <input type="url" value={form.url_facebook} placeholder="https://facebook.com/..." onChange={(e) => setForm((f) => ({ ...f, url_facebook: e.target.value }))} />
      </label>
      <label className="field">
        <span>YouTube URL</span>
        <input type="url" value={form.url_youtube} placeholder="https://youtube.com/..." onChange={(e) => setForm((f) => ({ ...f, url_youtube: e.target.value }))} />
      </label>
      <label className="field">
        <span>LinkedIn URL</span>
        <input type="url" value={form.url_linkedin} placeholder="https://linkedin.com/..." onChange={(e) => setForm((f) => ({ ...f, url_linkedin: e.target.value }))} />
      </label>
      <label className="field">
        <span>X URL</span>
        <input type="url" value={form.url_x} placeholder="https://x.com/..." onChange={(e) => setForm((f) => ({ ...f, url_x: e.target.value }))} />
      </label>
      <label className="field">
        <span>Threads URL</span>
        <input type="url" value={form.url_threads} placeholder="https://threads.net/..." onChange={(e) => setForm((f) => ({ ...f, url_threads: e.target.value }))} />
      </label>
      {mutation.isError ? (
        <p className="error-copy field-span-2">{mutation.error.message}</p>
      ) : null}
      <div className="field-span-2 form-actions inline-actions">
        <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
        <button className="primary-button" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

function InfluencerClientsSection({ influencerId }: { influencerId: string }) {
  const { clients, isLoading } = useInfluencerClients(influencerId);
  const addMutation = useAddInfluencerClientMutation(influencerId);
  const removeMutation = useRemoveInfluencerClientMutation(influencerId);
  const [showAdd, setShowAdd] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const clientLookup = useClientLookupQuery(clientSearch);
  const clientResults = clientLookup.data?.data ?? [];
  const assignedIds = new Set(clients.map((c) => c.id));

  return (
    <PageSection
      eyebrow="Clients"
      title="Assigned clients"
      actions={
        <button
          className="secondary-button"
          type="button"
          onClick={() => setShowAdd((v) => !v)}
        >
          {showAdd ? "Close" : "Add Client"}
        </button>
      }
    >
      {showAdd ? (
        <div style={{ marginBottom: 16 }}>
          <input
            className="search-bar-input"
            type="search"
            value={clientSearch}
            placeholder="Search clients..."
            onChange={(e) => setClientSearch(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          {clientSearch.trim() && clientResults.length > 0 ? (
            <table className="data-table">
              <tbody>
                {clientResults.map((client) => (
                  <tr key={client.id}>
                    <td>{client.name}</td>
                    <td>{client.industry ?? "—"}</td>
                    <td>
                      {assignedIds.has(client.id) ? (
                        <span className="muted">Assigned</span>
                      ) : (
                        <button
                          className="secondary-button"
                          type="button"
                          disabled={addMutation.isPending}
                          onClick={() => addMutation.mutate(client.id)}
                        >
                          Add
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {clientSearch.trim() && clientResults.length === 0 ? (
            <p className="muted">No clients match "{clientSearch}"</p>
          ) : null}
          {addMutation.isError ? (
            <p className="error-copy">{addMutation.error.message}</p>
          ) : null}
        </div>
      ) : null}

      {isLoading ? <p className="muted">Loading...</p> : null}
      {!isLoading && clients.length === 0 ? (
        <EmptyState title="No clients" message="This influencer is not assigned to any clients." />
      ) : null}
      {!isLoading && clients.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Industry</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td><Link to={`/clients/${client.id}`}>{client.name}</Link></td>
                <td>{client.industry ?? "—"}</td>
                <td>
                  <button
                    className="secondary-button danger-button"
                    type="button"
                    disabled={removeMutation.isPending}
                    onClick={() => {
                      if (window.confirm(`Remove ${client.name}?`)) {
                        removeMutation.mutate(client.id);
                      }
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </PageSection>
  );
}

export function InfluencerDetailPage({ canPlan }: { canPlan: boolean }) {
  const { influencerId } = useParams<{ influencerId: string }>();
  const [editing, setEditing] = useState(false);
  const [editingPlatforms, setEditingPlatforms] = useState(false);
  const { data, isLoading, isError, query } =
    useInfluencerAssignments(influencerId);
  const { average: overallRating, ratedCount } = useInfluencerOverallRating(influencerId);

  const influencer = data?.influencer ?? null;
  const assignments = data?.assignments ?? [];
  const campaignActionCounts = data?.campaign_action_counts ?? {};

  const campaigns = useMemo(() => {
    const seen = new Map<string, CampaignRow>();

    for (const assignment of assignments) {
      const campaign = assignment.action?.mission?.campaign;
      if (!campaign) continue;

      const isPublished =
        assignment.assignment_status === "approved" ||
        assignment.assignment_status === "completed";

      const existing = seen.get(campaign.id);
      if (existing) {
        if (isPublished) existing.publishedActions++;
      } else {
        seen.set(campaign.id, {
          campaignId: campaign.id,
          campaignName: campaign.name,
          clientName: campaign.company?.client?.name ?? "—",
          companyName: campaign.company?.name ?? "—",
          campaignStatus: campaign.status,
          totalActions: campaignActionCounts[campaign.id] ?? 0,
          publishedActions: isPublished ? 1 : 0,
        });
      }
    }

    return Array.from(seen.values());
  }, [assignments, campaignActionCounts]);

  if (isLoading) {
    return <p className="muted" style={{ padding: 32 }}>Loading influencer...</p>;
  }

  if (isError || !influencer) {
    return (
      <div style={{ padding: 32 }}>
        <ErrorState
          message="Influencer could not be loaded."
          onRetry={() => {
            void query.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <Link className="breadcrumb-link" to="/influencers">
        &lt; Influencers
      </Link>

      <PageSection
        eyebrow="Influencer"
        title={
          <span className="mission-header">
            {influencer.name}
            <StatusBadge
              label={influencer.status}
              tone={influencer.status === "active" ? "success" : influencer.status === "archived" ? "warning" : "info"}
            />
            {overallRating !== null ? (
              <span style={{ fontWeight: 600, fontSize: 16 }}>{overallRating.toFixed(1)} ★ ({ratedCount})</span>
            ) : null}
          </span>
        }
        actions={
          <button
            className="secondary-button"
            type="button"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Close" : "Edit"}
          </button>
        }
      >
        <div className="detail-fields">
          <div className="detail-field">
            <span className="detail-label">Email</span>
            <span>{influencer.email ?? "—"}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Phone</span>
            <span>{influencer.phone ?? "—"}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Address</span>
            <span>
              {[
                influencer.mailing_address,
                [influencer.city, influencer.state].filter(Boolean).join(", "),
                influencer.zip,
              ].filter(Boolean).join(" ") || "—"}
            </span>
          </div>
        </div>

        {editing ? (
          <InfluencerEditForm
            influencer={influencer}
            onClose={() => setEditing(false)}
          />
        ) : null}
      </PageSection>

      <PageSection
        eyebrow="Platforms"
        title="Social accounts"
        actions={
          <button
            className="secondary-button"
            type="button"
            onClick={() => setEditingPlatforms((v) => !v)}
          >
            {editingPlatforms ? "Close" : "Edit"}
          </button>
        }
      >
        <div className="detail-fields">
          <div className="detail-field">
            <span className="detail-label">Instagram</span>
            <span>{influencer.url_instagram ? <a className="primary-link" href={influencer.url_instagram} target="_blank" rel="noopener noreferrer">View</a> : "—"}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">TikTok</span>
            <span>{influencer.url_tiktok ? <a className="primary-link" href={influencer.url_tiktok} target="_blank" rel="noopener noreferrer">View</a> : "—"}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Facebook</span>
            <span>{influencer.url_facebook ? <a className="primary-link" href={influencer.url_facebook} target="_blank" rel="noopener noreferrer">View</a> : "—"}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">YouTube</span>
            <span>{influencer.url_youtube ? <a className="primary-link" href={influencer.url_youtube} target="_blank" rel="noopener noreferrer">View</a> : "—"}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">LinkedIn</span>
            <span>{influencer.url_linkedin ? <a className="primary-link" href={influencer.url_linkedin} target="_blank" rel="noopener noreferrer">View</a> : "—"}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">X</span>
            <span>{influencer.url_x ? <a className="primary-link" href={influencer.url_x} target="_blank" rel="noopener noreferrer">View</a> : "—"}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Threads</span>
            <span>{influencer.url_threads ? <a className="primary-link" href={influencer.url_threads} target="_blank" rel="noopener noreferrer">View</a> : "—"}</span>
          </div>
        </div>

        {editingPlatforms ? (
          <PlatformsEditForm
            influencer={influencer}
            onClose={() => setEditingPlatforms(false)}
          />
        ) : null}
      </PageSection>

      <InfluencerClientsSection influencerId={influencerId!} />

      <PageSection eyebrow="Campaigns" title="Campaign participation">
        {campaigns.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            message="This influencer has not been assigned to any campaigns."
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign Name</th>
                <th>Client</th>
                <th>Company</th>
                <th>Status</th>
                <th>Actions</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((row) => (
                <tr key={row.campaignId}>
                  <td>
                    <Link to={`/campaigns/${row.campaignId}`}>
                      {row.campaignName}
                    </Link>
                  </td>
                  <td>{row.clientName}</td>
                  <td>{row.companyName}</td>
                  <td>
                    <StatusBadge
                      label={row.campaignStatus}
                      tone={statusTone(row.campaignStatus)}
                    />
                  </td>
                  <td>
                    {row.publishedActions} / {row.totalActions}
                  </td>
                  <td>
                    <Link
                      className="secondary-button"
                      to={`/influencers/${influencerId}/campaigns/${row.campaignId}`}
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PageSection>
    </div>
  );
}
