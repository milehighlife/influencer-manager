import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Influencer } from "@influencer-manager/shared/types/mobile";

import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { PageSection } from "../components/PageSection";
import { StatusBadge } from "../components/StatusBadge";
import { useCampaignPlanningViewQuery } from "../hooks/use-campaign-builder";
import { actionAssignmentsApi, influencersApi } from "../services/api";
import { formatPlatform } from "../utils/format";

interface ActionInfo {
  id: string;
  title: string;
  platform: string;
  missionName: string;
  missionSeq: number;
  alreadyAssigned: Set<string>;
}

export function CampaignAssignPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const campaignQuery = useCampaignPlanningViewQuery(campaignId);
  const campaign = campaignQuery.data ?? null;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Checked state: actionId -> Set of influencerIds
  const [checked, setChecked] = useState<Map<string, Set<string>>>(new Map());

  const clientId = campaign?.company?.client_id ?? null;

  const actions = useMemo((): ActionInfo[] => {
    if (!campaign) return [];
    const result: ActionInfo[] = [];
    for (const mission of campaign.missions) {
      for (const action of mission.actions) {
        const assigned = new Set<string>();
        for (const a of action.assignments) {
          assigned.add(a.influencer_id);
        }
        result.push({
          id: action.id,
          title: action.title,
          platform: action.platform,
          missionName: mission.name,
          missionSeq: mission.sequence_order,
          alreadyAssigned: assigned,
        });
      }
    }
    result.sort((a, b) => a.missionSeq - b.missionSeq);
    return result;
  }, [campaign]);

  // Fetch eligible influencers per unique platform
  const uniquePlatforms = useMemo(
    () => [...new Set(actions.map((a) => a.platform))],
    [actions],
  );

  const influencersByPlatform = useQuery({
    queryKey: ["web", "influencers", "by-client-platform", clientId, uniquePlatforms],
    queryFn: async () => {
      if (!clientId) return {};
      const results: Record<string, Influencer[]> = {};
      await Promise.all(
        uniquePlatforms.map(async (platform) => {
          results[platform] = await influencersApi.listByClientAndPlatform(
            clientId,
            platform,
          );
        }),
      );
      return results;
    },
    enabled: Boolean(clientId) && uniquePlatforms.length > 0,
  });

  const platformInfluencers = influencersByPlatform.data ?? {};

  function toggleCheck(actionId: string, influencerId: string) {
    setChecked((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(actionId) ?? []);
      if (set.has(influencerId)) set.delete(influencerId);
      else set.add(influencerId);
      next.set(actionId, set);
      return next;
    });
  }

  function selectAll(actionId: string, influencerIds: string[]) {
    setChecked((prev) => {
      const next = new Map(prev);
      next.set(actionId, new Set(influencerIds));
      return next;
    });
  }

  function deselectAll(actionId: string) {
    setChecked((prev) => {
      const next = new Map(prev);
      next.set(actionId, new Set());
      return next;
    });
  }

  const totalNewAssignments = useMemo(() => {
    let count = 0;
    for (const action of actions) {
      const set = checked.get(action.id);
      if (!set) continue;
      for (const id of set) {
        if (!action.alreadyAssigned.has(id)) count++;
      }
    }
    return count;
  }, [checked, actions]);

  async function handleAssign() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const assignments: { action_id: string; influencer_id: string }[] = [];
      for (const action of actions) {
        const set = checked.get(action.id);
        if (!set) continue;
        for (const influencerId of set) {
          if (!action.alreadyAssigned.has(influencerId)) {
            assignments.push({ action_id: action.id, influencer_id: influencerId });
          }
        }
      }

      const result = await actionAssignmentsApi.bulkCreate(assignments);

      setSuccess(
        `Assigned ${result.created} influencer-action${result.created === 1 ? "" : "s"} successfully.` +
          (result.skipped > 0 ? ` ${result.skipped} already assigned.` : ""),
      );
      setChecked(new Map());
      void campaignQuery.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign.");
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
          onRetry={() => { void campaignQuery.refetch(); }}
        />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <Link className="breadcrumb-link" to={`/campaigns/${campaignId}`}>
        &lt; {campaign.name}
      </Link>

      <PageSection eyebrow="Assign" title="Assign influencers to campaign">
        {!clientId ? (
          <p className="muted">This campaign's company has no associated client. Assign a client first.</p>
        ) : influencersByPlatform.isLoading ? (
          <p className="muted">Loading eligible influencers...</p>
        ) : actions.length === 0 ? (
          <EmptyState title="No actions" message="Create actions in this campaign before assigning influencers." />
        ) : (
          <>
            {actions.map((action) => {
              const eligible = platformInfluencers[action.platform] ?? [];
              const actionChecked = checked.get(action.id) ?? new Set<string>();
              const newOnly = eligible.filter((i) => !action.alreadyAssigned.has(i.id));
              const allSelected = newOnly.length > 0 && newOnly.every((i) => actionChecked.has(i.id));

              return (
                <div key={action.id} className="mission-group" style={{ marginBottom: 20 }}>
                  <div className="mission-header">
                    <h3 style={{ margin: 0 }}>{action.title}</h3>
                    <StatusBadge label={formatPlatform(action.platform)} tone="primary" />
                  </div>
                  <p className="muted" style={{ margin: "4px 0 8px" }}>
                    Mission: {action.missionName}
                  </p>

                  {eligible.length === 0 ? (
                    <p className="muted">
                      No influencers assigned to this client have a {formatPlatform(action.platform)} profile.
                    </p>
                  ) : (
                    <>
                      <div style={{ marginBottom: 6 }}>
                        {allSelected ? (
                          <button
                            className="primary-link"
                            type="button"
                            style={{ background: "none", border: "none", cursor: "pointer", font: "inherit" }}
                            onClick={() => deselectAll(action.id)}
                          >
                            Deselect All
                          </button>
                        ) : (
                          <button
                            className="primary-link"
                            type="button"
                            style={{ background: "none", border: "none", cursor: "pointer", font: "inherit" }}
                            onClick={() =>
                              selectAll(
                                action.id,
                                newOnly.map((i) => i.id),
                              )
                            }
                          >
                            Select All
                          </button>
                        )}
                      </div>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th style={{ width: 40 }}></th>
                            <th>Influencer</th>
                            <th>{formatPlatform(action.platform)} Profile</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eligible.map((inf) => {
                            const assigned = action.alreadyAssigned.has(inf.id);
                            const isChecked = actionChecked.has(inf.id);
                            const urlKey = `url_${action.platform}` as keyof typeof inf;
                            const platformUrl = (urlKey in inf ? inf[urlKey] : null) as string | null;

                            return (
                              <tr
                                key={inf.id}
                                className={assigned ? "row-rated" : undefined}
                              >
                                <td>
                                  {assigned ? (
                                    <span className="muted" title="Already assigned">✓</span>
                                  ) : (
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() =>
                                        toggleCheck(action.id, inf.id)
                                      }
                                    />
                                  )}
                                </td>
                                <td>
                                  <Link to={`/influencers/${inf.id}`}>
                                    {inf.name}
                                  </Link>
                                </td>
                                <td>
                                  {platformUrl ? (
                                    <a
                                      className="primary-link"
                                      href={platformUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      View
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td>
                                  {assigned ? (
                                    <StatusBadge label="assigned" tone="success" />
                                  ) : isChecked ? (
                                    <StatusBadge label="selected" tone="info" />
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              );
            })}

            {success ? (
              <p style={{ color: "var(--color-success)", marginTop: 12 }}>{success}</p>
            ) : null}
            {error ? <p className="error-copy">{error}</p> : null}

            <div className="inline-actions" style={{ marginTop: 16 }}>
              {totalNewAssignments > 0 ? (
                <button
                  className="primary-button"
                  type="button"
                  disabled={saving}
                  onClick={handleAssign}
                >
                  {saving
                    ? "Assigning..."
                    : `Assign ${totalNewAssignments} Influencer-Action${totalNewAssignments === 1 ? "" : "s"}`}
                </button>
              ) : null}
              <Link className="secondary-button" to={`/campaigns/${campaignId}`}>
                {totalNewAssignments > 0 ? "Cancel" : "Back to campaign"}
              </Link>
            </div>
          </>
        )}
      </PageSection>
    </div>
  );
}
