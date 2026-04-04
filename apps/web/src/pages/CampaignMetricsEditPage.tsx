import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ErrorState } from "../components/ErrorState";
import { PageSection } from "../components/PageSection";
import { useCampaignPlanningViewQuery } from "../hooks/use-campaign-builder";
import { actionAssignmentsApi } from "../services/api";

interface MetricRow {
  assignmentId: string;
  influencerName: string;
  lastName: string;
  actionTitle: string;
  views: string;
  comments: string;
  shares: string;
  originalViews: number;
  originalComments: number;
  originalShares: number;
}

type SortColumn = "influencer" | "action" | "views" | "comments" | "shares";

function SortableHeader({
  label,
  column,
  activeColumn,
  direction,
  onSort,
}: {
  label: string;
  column: SortColumn;
  activeColumn: SortColumn;
  direction: "asc" | "desc";
  onSort: (column: SortColumn) => void;
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

export function CampaignMetricsEditPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const campaignQuery = useCampaignPlanningViewQuery(campaignId);
  const campaign = campaignQuery.data ?? null;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<SortColumn>("influencer");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const isCampaignClosed =
    campaign?.status === "completed" || campaign?.status === "archived";

  const initialRows = useMemo(() => {
    if (!campaign) return [];

    const rows: MetricRow[] = [];
    for (const mission of campaign.missions) {
      for (const action of mission.actions) {
        for (const assignment of action.assignments) {
          // For completed campaigns, only show assignments with published media
          if (isCampaignClosed && !assignment.submission_url) {
            continue;
          }

          const name = assignment.influencer_summary.name;
          const spaceIdx = name.indexOf(" ");
          const lastName = spaceIdx === -1 ? name : name.slice(spaceIdx + 1);

          rows.push({
            assignmentId: assignment.id,
            influencerName: name,
            lastName: lastName.toLowerCase(),
            actionTitle: action.title,
            views: String(assignment.total_views ?? 0),
            comments: String(assignment.total_comments ?? 0),
            shares: String(assignment.total_shares ?? 0),
            originalViews: assignment.total_views ?? 0,
            originalComments: assignment.total_comments ?? 0,
            originalShares: assignment.total_shares ?? 0,
          });
        }
      }
    }

    return rows;
  }, [campaign, isCampaignClosed]);

  const [rows, setRows] = useState<MetricRow[]>([]);

  useEffect(() => {
    if (initialRows.length > 0 && rows.length === 0) {
      setRows(initialRows);
    }
  }, [initialRows]);

  const sortedIndices = useMemo(() => {
    const indices = rows.map((_, i) => i);
    const dir = sortDir === "asc" ? 1 : -1;

    indices.sort((a, b) => {
      const ra = rows[a];
      const rb = rows[b];
      let av: string | number;
      let bv: string | number;

      switch (sortCol) {
        case "influencer":
          av = ra.lastName;
          bv = rb.lastName;
          break;
        case "action":
          av = ra.actionTitle.toLowerCase();
          bv = rb.actionTitle.toLowerCase();
          break;
        case "views":
          av = Number(ra.views) || 0;
          bv = Number(rb.views) || 0;
          break;
        case "comments":
          av = Number(ra.comments) || 0;
          bv = Number(rb.comments) || 0;
          break;
        case "shares":
          av = Number(ra.shares) || 0;
          bv = Number(rb.shares) || 0;
          break;
      }

      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    return indices;
  }, [rows, sortCol, sortDir]);

  function handleSort(column: SortColumn) {
    if (sortCol === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(column);
      setSortDir("asc");
    }
  }

  function updateRow(
    index: number,
    field: "views" | "comments" | "shares",
    value: string,
  ) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const changedRows = rows.filter(
        (r) =>
          r.views !== String(r.originalViews) ||
          r.comments !== String(r.originalComments) ||
          r.shares !== String(r.originalShares),
      );

      await Promise.all(
        changedRows.map((r) =>
          actionAssignmentsApi.update(r.assignmentId, {
            total_views: Number(r.views) || 0,
            total_comments: Number(r.comments) || 0,
            total_shares: Number(r.shares) || 0,
            metrics_updated_at: new Date().toISOString(),
          }),
        ),
      );

      navigate(`/campaigns/${campaignId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save metrics.");
    } finally {
      setSaving(false);
    }
  }

  if (campaignQuery.isLoading) {
    return <p className="muted" style={{ padding: 32 }}>Loading...</p>;
  }

  if (campaignQuery.isError || !campaign) {
    return (
      <div style={{ padding: 32 }}>
        <ErrorState
          message="Campaign could not be loaded."
          onRetry={() => {
            void campaignQuery.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <Link className="breadcrumb-link" to={`/campaigns/${campaignId}`}>
        &lt; {campaign.name}
      </Link>

      <PageSection eyebrow="Performance" title="Update Campaign Metrics">
        {rows.length === 0 ? (
          <p className="muted">No action assignments in this campaign.</p>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <SortableHeader label="Influencer" column="influencer" activeColumn={sortCol} direction={sortDir} onSort={handleSort} />
                  <SortableHeader label="Action" column="action" activeColumn={sortCol} direction={sortDir} onSort={handleSort} />
                  <SortableHeader label="Views" column="views" activeColumn={sortCol} direction={sortDir} onSort={handleSort} />
                  <SortableHeader label="Comments" column="comments" activeColumn={sortCol} direction={sortDir} onSort={handleSort} />
                  <SortableHeader label="Shares" column="shares" activeColumn={sortCol} direction={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {sortedIndices.map((index) => {
                  const row = rows[index];
                  return (
                    <tr key={row.assignmentId}>
                      <td>{row.influencerName}</td>
                      <td>{row.actionTitle}</td>
                      <td>
                        <input
                          className="metrics-input"
                          type="number"
                          min="0"
                          value={row.views}
                          onChange={(e) =>
                            updateRow(index, "views", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="metrics-input"
                          type="number"
                          min="0"
                          value={row.comments}
                          onChange={(e) =>
                            updateRow(index, "comments", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="metrics-input"
                          type="number"
                          min="0"
                          value={row.shares}
                          onChange={(e) =>
                            updateRow(index, "shares", e.target.value)
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {error ? <p className="error-copy">{error}</p> : null}

            <div className="inline-actions" style={{ marginTop: 16 }}>
              <button
                className="primary-button"
                type="button"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? "Saving..." : "Update"}
              </button>
              <Link
                className="secondary-button"
                to={`/campaigns/${campaignId}`}
              >
                Cancel
              </Link>
            </div>
          </>
        )}
      </PageSection>
    </div>
  );
}
