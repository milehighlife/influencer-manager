import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { PageSection } from "../components/PageSection";
import { StatusBadge } from "../components/StatusBadge";
import {
  useClientQuery,
  useClientCampaigns,
  useClientCompanies,
  useClientInfluencers,
  useCreateCompanyMutation,
} from "../hooks/use-client-manager";

function statusTone(status: string): "info" | "success" | "warning" | "danger" {
  if (status === "active") return "success";
  if (status === "completed") return "info";
  if (status === "archived") return "warning";
  if (status === "paused") return "danger";
  return "info";
}

function CompaniesSection({
  clientId,
  canPlan,
}: {
  clientId: string;
  canPlan: boolean;
}) {
  const { items, isLoading, isError, query } = useClientCompanies(clientId);
  const createMutation = useCreateCompanyMutation();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contactFirstName: "",
    contactLastName: "",
    contactEmail: "",
    contactPhone: "",
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(
      {
        client_id: clientId,
        name: form.name,
        contact_first_name: form.contactFirstName || undefined,
        contact_last_name: form.contactLastName || undefined,
        contact_email: form.contactEmail || undefined,
        contact_phone: form.contactPhone || undefined,
      },
      {
        onSuccess: () => {
          setForm({
            name: "",
            contactFirstName: "",
            contactLastName: "",
            contactEmail: "",
            contactPhone: "",
          });
          setShowForm(false);
        },
      },
    );
  }

  return (
    <PageSection
      eyebrow="Companies"
      title="Client organizations"
      actions={
        canPlan ? (
          <button
            className="primary-button"
            type="button"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Close" : "Add Company"}
          </button>
        ) : undefined
      }
    >
      {showForm ? (
        <form className="form-grid compact-form" onSubmit={handleCreate} style={{ marginBottom: 16 }}>
          <label className="field">
            <span>Name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label className="field">
            <span>Contact first name</span>
            <input
              value={form.contactFirstName}
              onChange={(e) => setForm((f) => ({ ...f, contactFirstName: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Contact last name</span>
            <input
              value={form.contactLastName}
              onChange={(e) => setForm((f) => ({ ...f, contactLastName: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Contact email</span>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Contact phone</span>
            <input
              type="tel"
              value={form.contactPhone}
              onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
            />
          </label>
          {createMutation.isError ? (
            <p className="error-copy field-span-2">{createMutation.error.message}</p>
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
      ) : null}

      {isLoading ? <p className="muted">Loading companies...</p> : null}
      {isError ? (
        <ErrorState
          message="Companies could not be loaded."
          onRetry={() => { void query.refetch(); }}
        />
      ) : null}
      {!isLoading && !isError && items.length === 0 ? (
        <EmptyState
          title="No companies yet"
          message="Add a company to this client."
        />
      ) : null}
      {!isLoading && !isError && items.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Phone</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((company) => (
              <tr key={company.id}>
                <td><strong><Link to={`/companies/${company.id}`}>{company.name}</Link></strong></td>
                <td>
                  {[company.contact_first_name, company.contact_last_name]
                    .filter(Boolean)
                    .join(" ") || "—"}
                </td>
                <td>{company.contact_email ?? "—"}</td>
                <td>{company.contact_phone ?? "—"}</td>
                <td>
                  <Link className="secondary-button" to={`/companies/${company.id}`}>
                    Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </PageSection>
  );
}

function InfluencersSection({ clientId }: { clientId: string }) {
  const { items, isLoading, isError, query } = useClientInfluencers(clientId);

  return (
    <PageSection eyebrow="Influencers" title="Client influencers">
      {isLoading ? <p className="muted">Loading influencers...</p> : null}
      {isError ? (
        <ErrorState
          message="Influencers could not be loaded."
          onRetry={() => { void query.refetch(); }}
        />
      ) : null}
      {!isLoading && !isError && items.length === 0 ? (
        <EmptyState
          title="No influencers yet"
          message="No influencers are linked to this client."
        />
      ) : null}
      {!isLoading && !isError && items.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Rating</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((inf) => (
              <tr key={inf.id}>
                <td><strong>{inf.name}</strong></td>
                <td>
                  {inf.rating_average != null
                    ? `${inf.rating_average} (${inf.published_action_count})`
                    : `— (${inf.published_action_count})`}
                </td>
                <td>
                  <Link className="secondary-button" to={`/influencers/${inf.id}`}>
                    Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </PageSection>
  );
}

export function ClientDetailPage({ canPlan }: { canPlan: boolean }) {
  const { clientId } = useParams<{ clientId: string }>();
  const clientQuery = useClientQuery(clientId);
  const client = clientQuery.data;
  const { items: campaigns, isLoading: campaignsLoading, isError: campaignsError, campaignsQuery } =
    useClientCampaigns(clientId);

  if (clientQuery.isLoading) {
    return <p className="muted" style={{ padding: 32 }}>Loading client...</p>;
  }

  if (clientQuery.isError || !client) {
    return (
      <div style={{ padding: 32 }}>
        <ErrorState
          message="Client could not be loaded."
          onRetry={() => { void clientQuery.refetch(); }}
        />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageSection
        eyebrow="Client"
        title={client.name}
        actions={
          <Link className="secondary-button" to="/clients">
            Back to clients
          </Link>
        }
      >
        <div className="detail-fields">
          {client.industry ? (
            <div className="detail-field">
              <span className="detail-label">Industry</span>
              <span><strong>{client.industry}</strong></span>
            </div>
          ) : null}
          <div className="detail-field">
            <span className="detail-label">Status</span>
            <StatusBadge
              label={client.status}
              tone={client.status === "active" ? "success" : client.status === "archived" ? "warning" : "info"}
            />
          </div>
          {client.primary_contact_first_name || client.primary_contact_name ? (
            <div className="detail-field">
              <span className="detail-label">Contact</span>
              <span><strong>{[client.primary_contact_first_name, client.primary_contact_name].filter(Boolean).join(" ")}</strong></span>
            </div>
          ) : null}
          {client.primary_contact_email ? (
            <div className="detail-field">
              <span className="detail-label">Email</span>
              <span>{client.primary_contact_email}</span>
            </div>
          ) : null}
          {client.primary_contact_phone ? (
            <div className="detail-field">
              <span className="detail-label">Phone</span>
              <span>{client.primary_contact_phone}</span>
            </div>
          ) : null}
        </div>
      </PageSection>

      <CompaniesSection clientId={clientId!} canPlan={canPlan} />

      <InfluencersSection clientId={clientId!} />

      <PageSection
        eyebrow="Campaigns"
        title="Client campaigns"
        actions={
          canPlan ? (
            <Link className="primary-button" to={`/campaigns?create=1&clientId=${clientId}`}>
              Create Campaign
            </Link>
          ) : undefined
        }
      >
        {campaignsLoading ? <p className="muted">Loading campaigns...</p> : null}
        {campaignsError ? (
          <ErrorState
            message="Campaigns could not be loaded."
            onRetry={() => { void campaignsQuery.refetch(); }}
          />
        ) : null}
        {!campaignsLoading && !campaignsError && campaigns.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            message="This client has no campaigns."
          />
        ) : null}
        {!campaignsLoading && !campaignsError && campaigns.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Campaign</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td>{campaign.company.name}</td>
                  <td>
                    <Link to={`/campaigns/${campaign.id}`}>{campaign.name}</Link>
                  </td>
                  <td>
                    <StatusBadge label={campaign.status} tone={statusTone(campaign.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </PageSection>
    </div>
  );
}
