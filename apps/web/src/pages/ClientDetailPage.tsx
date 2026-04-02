import { Link, useParams } from "react-router-dom";

import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { PageSection } from "../components/PageSection";
import { StatusBadge } from "../components/StatusBadge";
import {
  useClientQuery,
  useClientCampaigns,
} from "../hooks/use-client-manager";

function statusTone(status: string): "info" | "success" | "warning" | "danger" {
  if (status === "active") return "success";
  if (status === "completed") return "info";
  if (status === "archived") return "warning";
  if (status === "paused") return "danger";
  return "info";
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
        <div className="detail-summary-grid">
          {client.industry ? (
            <div className="stat-card">
              <span className="muted">Industry</span>
              <strong>{client.industry}</strong>
            </div>
          ) : null}
          <div className="stat-card">
            <span className="muted">Status</span>
            <div>
              <StatusBadge
                label={client.status}
                tone={client.status === "active" ? "success" : client.status === "archived" ? "warning" : "info"}
              />
            </div>
          </div>
          {client.primary_contact_name ? (
            <div className="stat-card">
              <span className="muted">Contact name</span>
              <strong>{client.primary_contact_name}</strong>
            </div>
          ) : null}
          {client.primary_contact_email ? (
            <div className="stat-card">
              <span className="muted">Contact email</span>
              <strong>{client.primary_contact_email}</strong>
            </div>
          ) : null}
        </div>
      </PageSection>

      <PageSection eyebrow="Campaigns" title="Client campaigns">
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
            message="This client has no campaigns. Create one from the Campaigns page."
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
