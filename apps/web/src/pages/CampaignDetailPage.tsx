import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ACTION_STATUSES,
  ASSIGNMENT_STATUSES,
  MISSION_STATUSES,
  SOCIAL_PLATFORMS,
} from "@influencer-manager/shared/types/mobile";
import type { CampaignStatus } from "@influencer-manager/shared/types/mobile";

import { AddExternalLinkDialog } from "../components/AddExternalLinkDialog";
import { AssetUploadZone } from "../components/AssetUploadZone";
import { BulkCampaignMessageDialog } from "../components/BulkCampaignMessageDialog";
import { ConfirmCascadeDialog } from "../components/ConfirmCascadeDialog";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { MediaLibrary } from "../components/MediaLibrary";
import { PageSection } from "../components/PageSection";
import { StatusBadge } from "../components/StatusBadge";
import {
  useCampaignAssets,
  useCreateAssetMutation,
  useDeleteAssetMutation,
  useUpdateAssetMutation,
} from "../hooks/use-campaign-assets";
import {
  getLookupHelperMessage,
  useCampaignPlanningViewQuery,
  useCascadeCompleteMutation,
  useCascadePreviewQuery,
  useCreateActionMutation,
  useCreateAssignmentMutation,
  useCreateMissionMutation,
  useDeleteActionMutation,
  useDeleteAssignmentMutation,
  useDeleteMissionMutation,
  useFilteredInfluencers,
  useReorderMissionMutation,
  useUpdateActionMutation,
  useUpdateCampaignMutation,
  useUpdateMissionMutation,
} from "../hooks/use-campaign-builder";
import {
  buildCampaignTimeline,
  filterMissionActions,
  getActionStatusOptions,
  getCampaignStatusOptions,
  getTimelineScheduleLabel,
  toNullableScheduleValue,
  type PlannerActionFilters,
  validateCampaignSchedule,
  validateActionWindow,
  validateMissionSchedule,
} from "../utils/campaign-builder";
import { formatDate, formatPlatform } from "../utils/format";

const CONTENT_FORMAT_OPTIONS = [
  "in_feed_post",
  "carousel",
  "reel",
  "story",
  "short_video",
  "long_form_video",
  "live_stream",
  "other",
] as const;

function CampaignEditor({
  campaign,
  canPlan,
}: {
  campaign: NonNullable<
    ReturnType<typeof useCampaignPlanningViewQuery>["data"]
  >;
  canPlan: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showCascadeDialog, setShowCascadeDialog] = useState(false);
  const mutation = useUpdateCampaignMutation(campaign.id);
  const cascadeMutation = useCascadeCompleteMutation(campaign.id);
  const cascadePreview = useCascadePreviewQuery(
    campaign.id,
    showCascadeDialog,
  );
  const statusOptions = getCampaignStatusOptions(campaign.status);
  const [form, setForm] = useState({
    name: campaign.name,
    start_date: campaign.start_date?.slice(0, 10) ?? "",
    end_date: campaign.end_date?.slice(0, 10) ?? "",
    status: campaign.status,
  });
  const scheduleValidationError = validateCampaignSchedule({
    startDate: form.start_date,
    endDate: form.end_date,
    missions: campaign.missions,
  });

  const saveNonCascade = () => {
    mutation.mutate(
      {
        name: form.name,
        start_date: toNullableScheduleValue(form.start_date),
        end_date: toNullableScheduleValue(form.end_date),
        status: form.status,
      },
      {
        onSuccess: () => {
          setShowCascadeDialog(false);
          setIsEditing(false);
        },
      },
    );
  };

  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    // If changing to completed and coming from a non-completed status, show cascade dialog
    if (form.status === "completed" && campaign.status !== "completed") {
      setShowCascadeDialog(true);
      return;
    }

    saveNonCascade();
  };

  const handleCascadeConfirm = () => {
    const preview = cascadePreview.data;
    if (!preview) return;

    // If all counts are zero, skip cascade and just update status normally
    const totalChanges =
      preview.missions_to_complete +
      preview.actions_to_complete +
      preview.assignments_to_close;

    if (totalChanges === 0) {
      saveNonCascade();
      return;
    }

    cascadeMutation.mutate(campaign.version, {
      onSuccess: () => {
        setShowCascadeDialog(false);
        setIsEditing(false);
      },
    });
  };

  const handleCascadeCancel = () => {
    setShowCascadeDialog(false);
    cascadeMutation.reset();
  };

  return (
    <PageSection
      eyebrow="Campaign detail"
      title={
        <span className="mission-header">
          {campaign.name}
          <StatusBadge
            label={campaign.status}
            tone={campaign.status === "active" ? "success" : "info"}
          />
        </span>
      }
      actions={
        canPlan ? (
          <button
            className="primary-button"
            type="button"
            onClick={() => setIsEditing((value) => !value)}
          >
            {isEditing ? "Close editor" : "Edit Campaign"}
          </button>
        ) : undefined
      }
    >
      <div className="detail-summary-grid">
        <div>
          <p className="muted">Company</p>
          <strong>{campaign.company.name}</strong>
        </div>
        <div>
          <p className="muted">Dates</p>
          <strong>
            {formatDate(campaign.start_date)} to {formatDate(campaign.end_date)}
          </strong>
        </div>
        <div>
          <p className="muted">Planning footprint</p>
          <strong>{campaign.missions.length} missions</strong>
        </div>
      </div>
      {campaign.description ? <p className="muted">{campaign.description}</p> : null}

      {isEditing ? (
        <form
          className="form-grid compact-form"
          onSubmit={handleFormSubmit}
        >
          <label className="field">
            <span>Campaign name</span>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as CampaignStatus,
                }))
              }
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <div className="field">
            <span>Start date</span>
            <div className="field-input-row">
              <input
                type="date"
                aria-label="Start date"
                value={form.start_date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    start_date: event.target.value,
                  }))
                }
              />
              <button
                className="secondary-button field-clear-button"
                type="button"
                onClick={() =>
                  setForm((current) => ({ ...current, start_date: "" }))
                }
              >
                Clear
              </button>
            </div>
          </div>
          <div className="field">
            <span>End date</span>
            <div className="field-input-row">
              <input
                type="date"
                aria-label="End date"
                value={form.end_date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    end_date: event.target.value,
                  }))
                }
              />
              <button
                className="secondary-button field-clear-button"
                type="button"
                onClick={() =>
                  setForm((current) => ({ ...current, end_date: "" }))
                }
              >
                Clear
              </button>
            </div>
          </div>
          {mutation.isError ? (
            <p className="error-copy field-span-2">{mutation.error.message}</p>
          ) : null}
          {scheduleValidationError ? (
            <p className="error-copy field-span-2">{scheduleValidationError}</p>
          ) : null}
          <div className="field-span-2 form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={mutation.isPending || Boolean(scheduleValidationError)}
            >
              {mutation.isPending ? "Saving..." : "Save campaign"}
            </button>
          </div>
        </form>
      ) : null}

      {showCascadeDialog && cascadePreview.data ? (
        <ConfirmCascadeDialog
          campaignName={campaign.name}
          preview={cascadePreview.data}
          isExecuting={cascadeMutation.isPending || mutation.isPending}
          error={
            cascadeMutation.isError
              ? "Something went wrong. No changes were made. Please try again."
              : mutation.isError
                ? mutation.error.message
                : null
          }
          onCancel={handleCascadeCancel}
          onConfirm={handleCascadeConfirm}
        />
      ) : null}

      {showCascadeDialog && cascadePreview.isLoading ? (
        <div className="confirm-overlay">
          <div className="confirm-dialog cascade-dialog">
            <h3>Loading cascade preview...</h3>
            <p>Analyzing campaign impact...</p>
          </div>
        </div>
      ) : null}

      {showCascadeDialog && cascadePreview.isError ? (
        <div className="confirm-overlay" onClick={handleCascadeCancel}>
          <div className="confirm-dialog cascade-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Error</h3>
            <p className="error-copy">
              Failed to load cascade preview. Please try again.
            </p>
            <div className="confirm-dialog-actions">
              <button className="secondary-button" type="button" onClick={handleCascadeCancel}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageSection>
  );
}

function TimelineStateBadge({
  state,
}: {
  state: "scheduled" | "partial" | "unscheduled";
}) {
  const tone =
    state === "scheduled" ? "success" : state === "partial" ? "warning" : "info";

  return <StatusBadge label={getTimelineScheduleLabel(state)} tone={tone} />;
}

function TimelineRangeCopy({
  start,
  end,
  partialPrefix,
  mode = "date",
}: {
  start: string | null;
  end: string | null;
  partialPrefix: string;
  mode?: "date" | "datetime";
}) {
  if (start && end) {
    return (
      <>
        {formatDate(start, { mode })} to {formatDate(end, { mode })}
      </>
    );
  }

  if (start) {
    return (
      <>
        {partialPrefix} {formatDate(start, { mode })}
      </>
    );
  }

  if (end) {
    return (
      <>
        Ends by {formatDate(end, { mode })}
      </>
    );
  }

  return <>Unscheduled</>;
}

function CampaignInfluencersSection({
  campaign,
  onRefresh,
}: {
  campaign: NonNullable<
    ReturnType<typeof useCampaignPlanningViewQuery>["data"]
  >;
  onRefresh: () => void;
}) {
  const [removing, setRemoving] = useState<string | null>(null);
  const [teamPage, setTeamPage] = useState(1);
  const [showMessageAll, setShowMessageAll] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const teamPageSize = 20;

  const influencerMap = new Map<
    string,
    { id: string; name: string; email: string | null; completed: number; totalAssigned: number; assignmentIds: string[] }
  >();

  for (const mission of campaign.missions) {
    for (const action of mission.actions) {
      for (const assignment of action.assignments) {
        const existing = influencerMap.get(assignment.influencer_id);
        const isCompleted =
          assignment.assignment_status === "submitted" ||
          assignment.assignment_status === "approved" ||
          assignment.assignment_status === "completed" ||
          assignment.assignment_status === "revision";
        if (existing) {
          existing.totalAssigned++;
          existing.assignmentIds.push(assignment.id);
          if (isCompleted) existing.completed++;
        } else {
          influencerMap.set(assignment.influencer_id, {
            id: assignment.influencer_id,
            name: assignment.influencer_summary.name,
            email: assignment.influencer_summary.email,
            totalAssigned: 1,
            completed: isCompleted ? 1 : 0,
            assignmentIds: [assignment.id],
          });
        }
      }
    }
  }

  const influencers = Array.from(influencerMap.values());
  const [teamSort, setTeamSort] = useState<{ column: "name" | "status"; direction: "asc" | "desc" }>({ column: "name", direction: "asc" });

  const sortedInfluencers = [...influencers].sort((a, b) => {
    const dir = teamSort.direction === "asc" ? 1 : -1;
    if (teamSort.column === "name") {
      return a.name.localeCompare(b.name) * dir;
    }
    return (a.completed / (a.totalAssigned || 1) - b.completed / (b.totalAssigned || 1)) * dir;
  });

  function handleTeamSort(column: "name" | "status") {
    setTeamSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" },
    );
    setTeamPage(1);
  }

  return (
    <PageSection
      eyebrow="Team"
      title="Influencers"
      actions={
        <div className="inline-actions">
          {influencers.length > 0 ? (
            <button
              className="secondary-button"
              type="button"
              onClick={() => setShowMessageAll(true)}
            >
              Message All
            </button>
          ) : null}
          {campaign.status !== "completed" && campaign.status !== "archived" ? (
            <>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setShowInvite(true)}
              >
                Invite Influencers
              </button>
              <Link className="primary-button" to={`/campaigns/${campaign.id}/assign`}>
                Assign Influencer
              </Link>
            </>
          ) : null}
        </div>
      }
    >
      {influencers.length === 0 ? (
        <EmptyState
          title="No influencers"
          message="No influencers have been assigned to this campaign."
        />
      ) : (
        <>
        <table className="data-table">
          <thead>
            <tr>
              <th className="sortable-th" onClick={() => handleTeamSort("name")}>
                Influencer Name
                {teamSort.column === "name" ? (
                  <span className="sort-arrow sort-active">
                    {teamSort.direction === "asc" ? " \u25B2" : " \u25BC"}
                  </span>
                ) : null}
              </th>
              <th className="sortable-th" onClick={() => handleTeamSort("status")}>
                Status
                {teamSort.column === "status" ? (
                  <span className="sort-arrow sort-active">
                    {teamSort.direction === "asc" ? " \u25B2" : " \u25BC"}
                  </span>
                ) : null}
              </th>
              {campaign.status !== "completed" && campaign.status !== "archived" ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {sortedInfluencers.slice((teamPage - 1) * teamPageSize, teamPage * teamPageSize).map((inf) => (
              <tr key={inf.id}>
                <td>
                  <Link to={`/influencers/${inf.id}`}>{inf.name}</Link>
                </td>
                <td>
                  {inf.completed} / {inf.totalAssigned}
                </td>
                {campaign.status !== "completed" && campaign.status !== "archived" ? (
                  <td>
                    <button
                      className="secondary-button danger-button"
                      type="button"
                      disabled={removing === inf.id}
                      onClick={async () => {
                        if (!window.confirm(`Remove ${inf.name} from this campaign? This will delete all ${inf.totalAssigned} action assignment${inf.totalAssigned === 1 ? "" : "s"}.`)) return;
                        setRemoving(inf.id);
                        try {
                          const { actionAssignmentsApi } = await import("../services/api");
                          await Promise.all(inf.assignmentIds.map((id) => actionAssignmentsApi.remove(id)));
                          onRefresh();
                        } finally {
                          setRemoving(null);
                        }
                      }}
                    >
                      {removing === inf.id ? "Removing..." : "Remove"}
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        {sortedInfluencers.length > teamPageSize ? (
          <div className="list-pagination">
            <p className="muted">
              Page {teamPage} of {Math.ceil(sortedInfluencers.length / teamPageSize)} · {sortedInfluencers.length} influencers
            </p>
            <div className="inline-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setTeamPage((p) => Math.max(1, p - 1))}
                disabled={teamPage <= 1}
              >
                Previous
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setTeamPage((p) => p < Math.ceil(sortedInfluencers.length / teamPageSize) ? p + 1 : p)}
                disabled={teamPage >= Math.ceil(sortedInfluencers.length / teamPageSize)}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button
            className="primary-link"
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", font: "inherit" }}
            onClick={async () => {
              const { influencersApi } = await import("../services/api");
              const rows: string[][] = [["First Name", "Last Name", "Mailing Address", "City", "State", "Zip", "Email"]];
              for (const inf of sortedInfluencers) {
                try {
                  const full = await influencersApi.get(inf.id);
                  const spaceIdx = full.name.indexOf(" ");
                  const firstName = spaceIdx === -1 ? full.name : full.name.slice(0, spaceIdx);
                  const lastName = spaceIdx === -1 ? "" : full.name.slice(spaceIdx + 1);
                  rows.push([
                    firstName,
                    lastName,
                    full.mailing_address ?? "",
                    full.city ?? "",
                    full.state ?? "",
                    full.zip ?? "",
                    full.email ?? "",
                  ]);
                } catch {
                  const spaceIdx = inf.name.indexOf(" ");
                  rows.push([
                    spaceIdx === -1 ? inf.name : inf.name.slice(0, spaceIdx),
                    spaceIdx === -1 ? "" : inf.name.slice(spaceIdx + 1),
                    "", "", "", "",
                    inf.email ?? "",
                  ]);
                }
              }
              const csv = rows.map(r => r.map(v => '"' + v.replace(/"/g, '""') + '"').join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "campaign-influencers.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download CSV
          </button>
        </div>
        </>
      )}

      {showMessageAll ? (
        <BulkCampaignMessageDialog
          campaignId={campaign.id}
          campaignName={campaign.name}
          influencerIds={influencers.map((inf) => inf.id)}
          influencerCount={influencers.length}
          onClose={() => setShowMessageAll(false)}
          onSuccess={() => setShowMessageAll(false)}
        />
      ) : null}

      {showInvite ? (
        <InviteInfluencersDialog
          campaign={campaign}
          onClose={() => setShowInvite(false)}
          onSuccess={() => {
            setShowInvite(false);
            onRefresh();
          }}
        />
      ) : null}
    </PageSection>
  );
}

function InviteInfluencersDialog({
  campaign,
  onClose,
  onSuccess,
}: {
  campaign: NonNullable<ReturnType<typeof useCampaignPlanningViewQuery>["data"]>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [eligibleInfluencers, setEligibleInfluencers] = useState<
    { id: string; name: string; platforms: string[] }[]
  >([]);

  const clientId = campaign.company?.client_id ?? null;

  // Gather all action platforms in this campaign
  const actionPlatforms = new Set<string>();
  for (const mission of campaign.missions) {
    for (const action of mission.actions) {
      actionPlatforms.add(action.platform);
    }
  }

  let totalActions = 0;
  for (const mission of campaign.missions) {
    totalActions += mission.actions.length;
  }

  // Load influencers on mount
  React.useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    (async () => {
      try {
        const { influencersApi } = await import("../services/api");
        const results = await influencersApi.listByClientAndPlatform(clientId);
        if (cancelled) return;

        const platformKeys = ["url_instagram", "url_tiktok", "url_facebook", "url_youtube", "url_linkedin", "url_x", "url_threads"] as const;
        const platformNames: Record<string, string> = {
          url_instagram: "instagram",
          url_tiktok: "tiktok",
          url_facebook: "facebook",
          url_youtube: "youtube",
          url_linkedin: "linkedin",
          url_x: "x",
          url_threads: "threads",
        };

        const mapped = results.map((inf) => {
          const platforms: string[] = [];
          for (const key of platformKeys) {
            if (inf[key]) {
              platforms.push(platformNames[key]);
            }
          }
          return { id: inf.id, name: inf.name, platforms };
        });

        setEligibleInfluencers(mapped);
        setLoaded(true);
      } catch {
        setError("Failed to load influencers.");
        setLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [clientId]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllMatching() {
    const matching = eligibleInfluencers.filter((inf) =>
      inf.platforms.some((p) => actionPlatforms.has(p)),
    );
    setSelected(new Set(matching.map((inf) => inf.id)));
  }

  async function handleInvite() {
    if (selected.size === 0) return;
    setSending(true);
    setError(null);
    try {
      const { campaignsApi } = await import("../services/api");
      await campaignsApi.invite(campaign.id, Array.from(selected));
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitations.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="confirm-dialog cascade-dialog"
        style={{ maxWidth: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Invite Influencers</h3>
        <p className="muted" style={{ margin: "0 0 12px", fontSize: 14 }}>
          Select influencers to invite to <strong>{campaign.name}</strong>.
        </p>

        {!clientId ? (
          <p className="muted">This campaign has no associated client.</p>
        ) : !loaded ? (
          <p className="muted">Loading influencers...</p>
        ) : eligibleInfluencers.length === 0 ? (
          <p className="muted">No influencers are associated with this client.</p>
        ) : (
          <>
            <div style={{ marginBottom: 8 }}>
              <button
                className="primary-link"
                type="button"
                style={{ background: "none", border: "none", cursor: "pointer", font: "inherit" }}
                onClick={selectAllMatching}
              >
                Select All Matching
              </button>
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>Name</th>
                    <th>Platforms</th>
                  </tr>
                </thead>
                <tbody>
                  {eligibleInfluencers.map((inf) => (
                    <tr key={inf.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(inf.id)}
                          onChange={() => toggleSelect(inf.id)}
                        />
                      </td>
                      <td>{inf.name}</td>
                      <td>
                        {inf.platforms.length > 0
                          ? inf.platforms.join(", ")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selected.size > 0 ? (
              <p className="muted" style={{ margin: "12px 0 0", fontSize: 13 }}>
                Inviting {selected.size} influencer{selected.size === 1 ? "" : "s"} to {totalActions} action{totalActions === 1 ? "" : "s"}
              </p>
            ) : null}
          </>
        )}

        {error ? <p className="error-copy" style={{ marginTop: 8 }}>{error}</p> : null}

        <div className="confirm-dialog-actions" style={{ marginTop: 16 }}>
          <button
            className="secondary-button"
            type="button"
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={sending || selected.size === 0}
            onClick={handleInvite}
          >
            {sending ? "Inviting..." : `Invite ${selected.size} Influencer${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function CampaignMetricsSection({
  campaign,
}: {
  campaign: NonNullable<
    ReturnType<typeof useCampaignPlanningViewQuery>["data"]
  >;
}) {
  let totalViews = 0;
  let totalComments = 0;
  let totalShares = 0;
  let totalAssigned = 0;
  let totalSubmitted = 0;

  for (const mission of campaign.missions) {
    for (const action of mission.actions) {
      for (const assignment of action.assignments) {
        totalAssigned++;
        totalViews += assignment.total_views ?? 0;
        totalComments += assignment.total_comments ?? 0;
        totalShares += assignment.total_shares ?? 0;
        if (
          assignment.assignment_status === "submitted" ||
          assignment.assignment_status === "approved" ||
          assignment.assignment_status === "completed" ||
          assignment.assignment_status === "revision"
        ) {
          totalSubmitted++;
        }
      }
    }
  }

  return (
    <PageSection
      eyebrow="Performance"
      title="Campaign metrics"
      actions={
        <Link className="primary-button" to={`/campaigns/${campaign.id}/metrics`}>
          Update Metrics
        </Link>
      }
    >
      <table className="data-table">
        <thead>
          <tr>
            <th>Actions</th>
            <th>Views</th>
            <th>Comments</th>
            <th>Shares</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>{totalSubmitted} / {totalAssigned}</strong></td>
            <td><strong>{totalViews.toLocaleString()}</strong></td>
            <td><strong>{totalComments.toLocaleString()}</strong></td>
            <td><strong>{totalShares.toLocaleString()}</strong></td>
          </tr>
        </tbody>
      </table>
    </PageSection>
  );
}

function CampaignTimelineSection({
  campaign,
}: {
  campaign: NonNullable<
    ReturnType<typeof useCampaignPlanningViewQuery>["data"]
  >;
}) {
  if (campaign.status === "completed" || campaign.status === "archived") {
    return (
      <PageSection eyebrow="Timeline" title="Schedule overview">
        <div className="campaign-complete-notice">
          <p>This campaign is complete.</p>
          <p className="muted">
            {campaign.missions.length}{" "}
            {campaign.missions.length === 1 ? "mission" : "missions"} and{" "}
            {campaign.missions.reduce((t, m) => t + m.actions.length, 0)}{" "}
            {campaign.missions.reduce((t, m) => t + m.actions.length, 0) === 1
              ? "action"
              : "actions"}{" "}
            were finalized when this campaign was marked as completed.
          </p>
        </div>
      </PageSection>
    );
  }

  const timeline = buildCampaignTimeline(campaign);
  const hasBars =
    timeline.frameStart &&
    timeline.frameEnd &&
    timeline.missions.some(
      (mission) =>
        mission.bar ||
        mission.actions.some((action) => action.bar),
    );

  return (
    <PageSection eyebrow="Timeline" title="Schedule overview">
      <div className="timeline-summary-grid">
        <div className="stat-card">
          <span className="muted">Campaign window</span>
          <strong>
            {timeline.frameSource === "campaign"
              ? `${formatDate(campaign.start_date)} to ${formatDate(campaign.end_date)}`
              : campaign.start_date || campaign.end_date
                ? `${formatDate(campaign.start_date)} to ${formatDate(campaign.end_date)}`
                : "Not set"}
          </strong>
          <span className="muted">
            {timeline.frameSource === "campaign"
              ? "Using saved campaign dates."
              : timeline.frameSource === "derived"
                ? "Timeline frame is derived from scheduled missions and actions."
                : "Add campaign, mission, or action dates to anchor the schedule."}
          </span>
        </div>
        <div className="stat-card">
          <span className="muted">Mission pacing</span>
          <strong>{campaign.missions.length} phases</strong>
          <span className="muted">
            {timeline.missions.filter((mission) => mission.scheduleState === "scheduled").length} scheduled •{" "}
            {timeline.missions.filter((mission) => mission.scheduleState !== "scheduled").length} needing date detail
          </span>
        </div>
        <div className="stat-card">
          <span className="muted">Action visibility</span>
          <strong>
            {timeline.missions.reduce(
              (total, mission) => total + mission.actionCount,
              0,
            )}{" "}
            actions
          </strong>
          <span className="muted">
            {timeline.missions.reduce(
              (total, mission) => total + mission.scheduledActionCount,
              0,
            )} scheduled •{" "}
            {timeline.missions.reduce(
              (total, mission) =>
                total + mission.actions.filter((action) => action.scheduleState !== "scheduled").length,
              0,
            )} partial or unscheduled
          </span>
        </div>
      </div>

      {timeline.frameSource !== "none" ? (
        <div className="timeline-frame-labels">
          <span>{formatDate(timeline.frameStart)}</span>
          <span>{formatDate(timeline.frameEnd)}</span>
        </div>
      ) : null}

      {timeline.missions.length === 0 ? (
        <EmptyState
          title="No mission schedule yet"
          message="Add the first mission to begin mapping the campaign timeline."
        />
      ) : (
        <div className="timeline-stack">
          {timeline.missions.map((mission) => (
            <div className="timeline-mission-card" key={mission.id}>
              <div className="timeline-row-header">
                <div>
                  <p className="eyebrow">Mission {mission.sequenceOrder}</p>
                  <h3>{mission.name}</h3>
                  <p className="meta-line">
                    <TimelineRangeCopy
                      start={mission.startDate}
                      end={mission.endDate}
                      partialPrefix="Starts"
                    />
                  </p>
                  {mission.gapBeforeDays ? (
                    <p className="meta-line">
                      Gap before this mission: {mission.gapBeforeDays} day
                      {mission.gapBeforeDays === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </div>
                <div className="stack-right">
                  <TimelineStateBadge state={mission.scheduleState} />
                  <span className="muted">
                    {mission.scheduledActionCount} of {mission.actionCount} actions scheduled
                  </span>
                </div>
              </div>

              {hasBars ? (
                <div className="timeline-track">
                  {mission.bar ? (
                    <div
                      className="timeline-bar timeline-bar-mission"
                      style={{
                        left: `${mission.bar.leftPercent}%`,
                        width: `${mission.bar.widthPercent}%`,
                      }}
                    />
                  ) : (
                    <div className="timeline-track-empty">
                      {getTimelineScheduleLabel(mission.scheduleState)}
                    </div>
                  )}
                </div>
              ) : null}

              {mission.actions.length === 0 ? (
                <p className="muted">No actions yet for this mission.</p>
              ) : (
                <div className="timeline-action-stack">
                  {mission.actions.map((action) => (
                    <div className="timeline-action-row" key={action.id}>
                      <div className="timeline-action-copy">
                        <strong>{action.title}</strong>
                        <p className="meta-line">
                          <TimelineRangeCopy
                            start={action.startWindow}
                            end={action.endWindow}
                            partialPrefix="Starts"
                            mode="datetime"
                          />
                        </p>
                      </div>
                      <div className="timeline-action-visual">
                        <TimelineStateBadge state={action.scheduleState} />
                        {hasBars ? (
                          <div className="timeline-track timeline-track-action">
                            {action.bar ? (
                              <div
                                className="timeline-bar timeline-bar-action"
                                style={{
                                  left: `${action.bar.leftPercent}%`,
                                  width: `${action.bar.widthPercent}%`,
                                }}
                              />
                            ) : (
                              <div className="timeline-track-empty">
                                {getTimelineScheduleLabel(action.scheduleState)}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageSection>
  );
}

function MissionForm({
  campaignId,
  campaignStartDate,
  campaignEndDate,
  siblingMissions,
}: {
  campaignId: string;
  campaignStartDate: string | null;
  campaignEndDate: string | null;
  siblingMissions: NonNullable<
    ReturnType<typeof useCampaignPlanningViewQuery>["data"]
  >["missions"];
}) {
  const mutation = useCreateMissionMutation(campaignId);
  const [form, setForm] = useState({
    name: "",
    description: "",
    sequence_order: "1",
    status: "planned",
    start_date: "",
    end_date: "",
  });
  const scheduleValidationError = validateMissionSchedule({
    sequenceOrder: Number(form.sequence_order),
    startDate: form.start_date,
    endDate: form.end_date,
    campaignStartDate,
    campaignEndDate,
    siblingMissions,
  });

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        if (scheduleValidationError) {
          return;
        }
        mutation.mutate({
          name: form.name,
          description: form.description || undefined,
          sequence_order: Number(form.sequence_order),
          status: form.status as typeof MISSION_STATUSES[number],
          start_date: form.start_date || undefined,
          end_date: form.end_date || undefined,
        });
      }}
    >
      <label className="field">
        <span>Mission name</span>
        <input
          required
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
        />
      </label>
      <label className="field">
        <span>Sequence order</span>
        <input
          required
          type="number"
          min="1"
          value={form.sequence_order}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              sequence_order: event.target.value,
            }))
          }
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
          {MISSION_STATUSES.map((status) => (
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
          aria-label="Mission start date"
          value={form.start_date}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              start_date: event.target.value,
            }))
          }
        />
      </label>
      <label className="field">
        <span>End date</span>
        <input
          type="date"
          aria-label="Mission end date"
          value={form.end_date}
          onChange={(event) =>
            setForm((current) => ({ ...current, end_date: event.target.value }))
          }
        />
      </label>
      <label className="field field-span-2">
        <span>Description</span>
        <textarea
          rows={3}
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
        />
      </label>
      {mutation.isError ? (
        <p className="error-copy field-span-2">{mutation.error.message}</p>
      ) : null}
      {scheduleValidationError ? (
        <p className="error-copy field-span-2">{scheduleValidationError}</p>
      ) : null}
      <div className="field-span-2 form-actions">
        <button
          className="primary-button"
          type="submit"
          disabled={mutation.isPending || Boolean(scheduleValidationError)}
        >
          {mutation.isPending ? "Adding..." : "Add mission"}
        </button>
      </div>
    </form>
  );
}

function MissionEditor({
  campaignId,
  campaignStatus,
  mission,
  canPlan,
  isOpen,
  onToggleOpen,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  isReordering,
  totalActionCount,
  totalAssignmentCount,
  campaignStartDate,
  campaignEndDate,
  siblingMissions,
}: {
  campaignId: string;
  campaignStatus: string;
  mission: NonNullable<
    ReturnType<typeof useCampaignPlanningViewQuery>["data"]
  >["missions"][number];
  canPlan: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isReordering: boolean;
  totalActionCount: number;
  totalAssignmentCount: number;
  campaignStartDate: string | null;
  campaignEndDate: string | null;
  siblingMissions: NonNullable<
    ReturnType<typeof useCampaignPlanningViewQuery>["data"]
  >["missions"];
}) {
  const isCampaignClosed = campaignStatus === "completed" || campaignStatus === "archived";
  const [isEditing, setIsEditing] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const updateMutation = useUpdateMissionMutation(campaignId, mission.id);
  const deleteMutation = useDeleteMissionMutation(campaignId);
  const [form, setForm] = useState({
    name: mission.name,
    description: mission.description ?? "",
    start_date: mission.start_date?.slice(0, 10) ?? "",
    end_date: mission.end_date?.slice(0, 10) ?? "",
  });
  const scheduleValidationError = validateMissionSchedule({
    missionId: mission.id,
    sequenceOrder: mission.sequence_order,
    startDate: form.start_date,
    endDate: form.end_date,
    campaignStartDate,
    campaignEndDate,
    siblingMissions,
  });

  return (
    <div className="panel mission-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Mission {mission.sequence_order}</p>
          <div className="mission-header">
            <h3 style={{ margin: 0 }}>{mission.name}</h3>
            <StatusBadge
              label={mission.status}
              tone={mission.status === "active" ? "success" : "info"}
            />
          </div>
        </div>
        {canPlan ? (
          <div className="inline-actions">
            {isCampaignClosed ? (
              <button
                className="secondary-button"
                type="button"
                onClick={onToggleOpen}
              >
                {isOpen ? "Close" : "View"}
              </button>
            ) : (
              <>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setIsEditing((v) => !v)}
                >
                  {isEditing ? "Close" : "Edit"}
                </button>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    setShowActionForm((v) => !v);
                    if (!isOpen) onToggleOpen();
                  }}
                >
                  {showActionForm ? "Close" : "Create Action"}
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
      {mission.description ? (
        <p className="muted">{mission.description}</p>
      ) : null}
      <p className="meta-line">
        {formatDate(mission.start_date)} – {formatDate(mission.end_date)}
      </p>
      {mission.actions.length > 0 ? (
        <table className="data-table" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Action</th>
              <th>Platform</th>
              <th>Format</th>
              <th>Influencers</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mission.actions.map((action) => {
              const isActionEditing = isOpen && expandedActionId === action.id;
              return (
                <React.Fragment key={action.id}>
                  <tr>
                    <td>
                      <Link to={`/campaigns/${campaignId}/actions/${action.id}`}>
                        {action.title}
                      </Link>
                    </td>
                    <td>{formatPlatform(action.platform)}</td>
                    <td>{action.content_format ? formatPlatform(action.content_format) : "—"}</td>
                    <td>{action.assignments.length}</td>
                    <td>
                      <StatusBadge
                        label={action.status}
                        tone={action.status === "active" ? "success" : "info"}
                      />
                    </td>
                    <td>
                      <Link
                        className="secondary-button"
                        to={`/campaigns/${campaignId}/actions/${action.id}`}
                      >
                        {isCampaignClosed ? "View" : "Edit"}
                      </Link>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      ) : null}
      {deleteMutation.isError ? (
        <p className="error-copy">{deleteMutation.error.message}</p>
      ) : null}

      {isEditing && !isCampaignClosed ? (
        <form
          className="form-grid compact-form"
          onSubmit={(event) => {
            event.preventDefault();
            updateMutation.mutate(
              {
                name: form.name,
                description: form.description || undefined,
                start_date: toNullableScheduleValue(form.start_date),
                end_date: toNullableScheduleValue(form.end_date),
              },
              {
                onSuccess: () => setIsEditing(false),
              },
            );
          }}
        >
          <label className="field">
            <span>Mission name</span>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </label>
          <label className="field field-span-2">
            <span>Description</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </label>
          <div className="field">
            <span>Mission start date</span>
            <div className="field-input-row">
              <input
                type="date"
                aria-label="Mission start date"
                value={form.start_date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    start_date: event.target.value,
                  }))
                }
              />
              <button
                className="secondary-button field-clear-button"
                type="button"
                onClick={() =>
                  setForm((current) => ({ ...current, start_date: "" }))
                }
              >
                Clear
              </button>
            </div>
          </div>
          <div className="field">
            <span>Mission end date</span>
            <div className="field-input-row">
              <input
                type="date"
                aria-label="Mission end date"
                value={form.end_date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    end_date: event.target.value,
                  }))
                }
              />
              <button
                className="secondary-button field-clear-button"
                type="button"
                onClick={() =>
                  setForm((current) => ({ ...current, end_date: "" }))
                }
              >
                Clear
              </button>
            </div>
          </div>
          <p className="muted field-span-2">
            {campaignStartDate || campaignEndDate
              ? `Campaign window: ${formatDate(campaignStartDate)} to ${formatDate(campaignEndDate)}`
              : "Campaign dates are not set, so this mission can use its own planning window."}
          </p>
          {scheduleValidationError ? (
            <p className="error-copy field-span-2">{scheduleValidationError}</p>
          ) : null}
          {updateMutation.isError ? (
            <p className="error-copy field-span-2">{updateMutation.error.message}</p>
          ) : null}
          <div className="field-span-2 form-actions">
            <button
              className="secondary-button"
              type="submit"
              disabled={updateMutation.isPending || Boolean(scheduleValidationError)}
            >
              {updateMutation.isPending ? "Saving..." : "Save mission"}
            </button>
          </div>
        </form>
      ) : null}

      {showActionForm && !isCampaignClosed ? (
        <ActionForm
          campaignId={campaignId}
          missionId={mission.id}
          missionStartDate={mission.start_date}
          missionEndDate={mission.end_date}
        />
      ) : null}
    </div>
  );
}

function ActionForm({
  campaignId,
  missionId,
  missionStartDate,
  missionEndDate,
}: {
  campaignId: string;
  missionId: string;
  missionStartDate: string | null;
  missionEndDate: string | null;
}) {
  const mutation = useCreateActionMutation(campaignId, missionId);
  const [form, setForm] = useState({
    title: "",
    platform: "instagram",
    instructions: "",
    content_format: "reel",
    required_deliverables: "1",
    approval_required: "true",
    start_window: "",
    end_window: "",
    status: "draft",
  });
  const scheduleValidationError = validateActionWindow({
    startWindow: form.start_window,
    endWindow: form.end_window,
    missionStartDate,
    missionEndDate,
  });

  return (
    <form
      className="form-grid compact-form"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate({
          title: form.title,
          platform: form.platform as typeof SOCIAL_PLATFORMS[number],
          instructions: form.instructions || undefined,
          content_format: form.content_format,
          required_deliverables: Number(form.required_deliverables),
          required_platforms: [form.platform],
          approval_required: form.approval_required === "true",
          start_window: form.start_window || undefined,
          end_window: form.end_window || undefined,
          status: form.status as typeof ACTION_STATUSES[number],
        });
      }}
    >
      <label className="field">
        <span>Action title</span>
        <input
          required
          value={form.title}
          onChange={(event) =>
            setForm((current) => ({ ...current, title: event.target.value }))
          }
        />
      </label>
      <label className="field">
        <span>Platform</span>
        <select
          value={form.platform}
          onChange={(event) =>
            setForm((current) => ({ ...current, platform: event.target.value }))
          }
        >
          {SOCIAL_PLATFORMS.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Content format</span>
        <select
          value={form.content_format}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              content_format: event.target.value,
            }))
          }
        >
          {CONTENT_FORMAT_OPTIONS.map((format) => (
            <option key={format} value={format}>
              {format}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Status</span>
        <select
          value={form.status}
          onChange={(event) =>
            setForm((current) => ({ ...current, status: event.target.value }))
          }
        >
          {ACTION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Required deliverables</span>
        <input
          type="number"
          min="1"
          value={form.required_deliverables}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              required_deliverables: event.target.value,
            }))
          }
        />
      </label>
      <label className="field">
        <span>Approval required</span>
        <select
          value={form.approval_required}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              approval_required: event.target.value,
            }))
          }
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>
      <label className="field">
        <span>Start window</span>
        <input
          type="datetime-local"
          value={form.start_window}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              start_window: event.target.value,
            }))
          }
        />
      </label>
      <label className="field">
        <span>End window</span>
        <input
          type="datetime-local"
          value={form.end_window}
          onChange={(event) =>
            setForm((current) => ({ ...current, end_window: event.target.value }))
          }
        />
      </label>
      <label className="field field-span-2">
        <span>Instructions</span>
        <textarea
          rows={3}
          value={form.instructions}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              instructions: event.target.value,
            }))
          }
        />
      </label>
      <p className="muted field-span-2">
        {missionStartDate || missionEndDate
          ? `Action window must stay inside the mission window: ${formatDate(missionStartDate)} to ${formatDate(missionEndDate)}.`
          : "Mission dates are not set, so this action can use its own execution window."}
      </p>
      {scheduleValidationError ? (
        <p className="error-copy field-span-2">{scheduleValidationError}</p>
      ) : null}
      {mutation.isError ? (
        <p className="error-copy field-span-2">{mutation.error.message}</p>
      ) : null}
      <div className="field-span-2 form-actions">
        <button
          className="secondary-button"
          type="submit"
          disabled={mutation.isPending || Boolean(scheduleValidationError)}
        >
          {mutation.isPending ? "Adding..." : "Add action"}
        </button>
      </div>
    </form>
  );
}

function AssignmentForm({
  campaignId,
  actionId,
}: {
  campaignId: string;
  actionId: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInfluencerId, setSelectedInfluencerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [expectedDeliverables, setExpectedDeliverables] = useState("1");
  const { filteredInfluencers, isLoading } = useFilteredInfluencers(searchTerm);
  const mutation = useCreateAssignmentMutation(campaignId, actionId);
  const lookupHelper = getLookupHelperMessage({
    searchTerm,
    subject: "influencers",
    count: filteredInfluencers.length,
  });

  return (
    <form
      className="form-grid compact-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!selectedInfluencerId) {
          return;
        }
        mutation.mutate({
          influencer_id: selectedInfluencerId,
          assignment_status: "assigned" as typeof ASSIGNMENT_STATUSES[number],
          due_date: dueDate || undefined,
          deliverable_count_expected: Number(expectedDeliverables),
        });
      }}
    >
      <label className="field field-span-2">
        <span>Search influencers</span>
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Name, handle, email, platform, or location"
        />
      </label>
      <label className="field field-span-2">
        <span>Select influencer</span>
        <select
          value={selectedInfluencerId}
          onChange={(event) => setSelectedInfluencerId(event.target.value)}
        >
          <option value="">Choose influencer</option>
          {filteredInfluencers.map((influencer) => (
            <option key={influencer.id} value={influencer.id}>
              {influencer.name} • {influencer.primary_platform}
            </option>
          ))}
        </select>
        <p className="muted field-helper-text">{lookupHelper}</p>
      </label>
      <label className="field">
        <span>Due date</span>
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />
      </label>
      <label className="field">
        <span>Expected deliverables</span>
        <input
          type="number"
          min="1"
          value={expectedDeliverables}
          onChange={(event) => setExpectedDeliverables(event.target.value)}
        />
      </label>
      {isLoading ? (
        <p className="muted field-span-2">Loading influencers...</p>
      ) : null}
      {mutation.isError ? (
        <p className="error-copy field-span-2">{mutation.error.message}</p>
      ) : null}
      <div className="field-span-2 form-actions">
        <button
          className="secondary-button"
          type="submit"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Assigning..." : "Assign influencer"}
        </button>
      </div>
    </form>
  );
}

function ActionEditor({
  campaignId,
  action,
  canPlan,
  missionStartDate,
  missionEndDate,
}: {
  campaignId: string;
  action: NonNullable<
    ReturnType<typeof useCampaignPlanningViewQuery>["data"]
  >["missions"][number]["actions"][number];
  canPlan: boolean;
  missionStartDate: string | null;
  missionEndDate: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showAssigner, setShowAssigner] = useState(false);
  const updateMutation = useUpdateActionMutation(campaignId, action.id);
  const deleteMutation = useDeleteActionMutation(campaignId);
  const deleteAssignmentMutation = useDeleteAssignmentMutation(campaignId);
  const statusOptions = getActionStatusOptions(action.status);
  const [form, setForm] = useState({
    title: action.title,
    platform: action.platform,
    required_deliverables: String(action.required_deliverables),
    start_window: action.start_window ? action.start_window.slice(0, 16) : "",
    end_window: action.end_window ? action.end_window.slice(0, 16) : "",
    status: action.status,
    instructions: action.instructions ?? "",
  });
  const scheduleValidationError = validateActionWindow({
    startWindow: form.start_window,
    endWindow: form.end_window,
    missionStartDate,
    missionEndDate,
  });

  return (
    <div className="action-card">
      <div className="section-header">
        <div>
          <div className="mission-header">
            <h4 style={{ margin: 0 }}>{action.title}</h4>
            <StatusBadge
              label={action.status}
              tone={action.status === "active" ? "success" : "info"}
            />
          </div>
          <p className="muted">
            {formatPlatform(action.platform)} • {action.content_format ?? "content"} •{" "}
            {action.required_deliverables} deliverable
            {action.required_deliverables === 1 ? "" : "s"}
          </p>
        </div>
        <div className="stack-right">
          {canPlan ? (
            <button
              className="secondary-button"
              type="button"
              onClick={() => setIsEditing((value) => !value)}
            >
              {isEditing ? "Close" : "Edit"}
            </button>
          ) : null}
        </div>
      </div>
      <p className="muted">
        {action.instructions || "No action instructions yet."}
      </p>
      <p className="meta-line">
        Window: {formatDate(action.start_window, { mode: "datetime" })} to{" "}
        {formatDate(action.end_window, { mode: "datetime" })}
      </p>
      {deleteMutation.isError ? (
        <p className="error-copy">{deleteMutation.error.message}</p>
      ) : null}
      {deleteAssignmentMutation.isError ? (
        <p className="error-copy">{deleteAssignmentMutation.error.message}</p>
      ) : null}

      {isEditing ? (
        <form
          className="form-grid compact-form"
          onSubmit={(event) => {
            event.preventDefault();
            updateMutation.mutate(
              {
                title: form.title,
                platform: form.platform,
                required_deliverables: Number(form.required_deliverables),
                start_window: toNullableScheduleValue(form.start_window),
                end_window: toNullableScheduleValue(form.end_window),
                status: form.status,
                instructions: form.instructions || undefined,
              },
              {
                onSuccess: () => setIsEditing(false),
              },
            );
          }}
        >
          <label className="field">
            <span>Action title</span>
            <input
              required
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Platform</span>
            <select
              value={form.platform}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  platform: event.target.value as typeof SOCIAL_PLATFORMS[number],
                }))
              }
            >
              {SOCIAL_PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Required deliverables</span>
            <input
              type="number"
              min="1"
              value={form.required_deliverables}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  required_deliverables: event.target.value,
                }))
              }
            />
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as typeof ACTION_STATUSES[number],
                }))
              }
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <div className="field">
            <span>Start window</span>
            <div className="field-input-row">
              <input
                type="datetime-local"
                aria-label="Start window"
                value={form.start_window}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    start_window: event.target.value,
                  }))
                }
              />
              <button
                className="secondary-button field-clear-button"
                type="button"
                onClick={() =>
                  setForm((current) => ({ ...current, start_window: "" }))
                }
              >
                Clear
              </button>
            </div>
          </div>
          <div className="field">
            <span>Deadline / end window</span>
            <div className="field-input-row">
              <input
                type="datetime-local"
                aria-label="Deadline / end window"
                value={form.end_window}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    end_window: event.target.value,
                  }))
                }
              />
              <button
                className="secondary-button field-clear-button"
                type="button"
                onClick={() =>
                  setForm((current) => ({ ...current, end_window: "" }))
                }
              >
                Clear
              </button>
            </div>
          </div>
          <label className="field field-span-2">
            <span>Instructions</span>
            <textarea
              rows={3}
              value={form.instructions}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  instructions: event.target.value,
                }))
              }
            />
          </label>
          <p className="muted field-span-2">
            {missionStartDate || missionEndDate
              ? `Parent mission window: ${formatDate(missionStartDate)} to ${formatDate(missionEndDate)}`
              : "Mission dates are not set, so this action can use its own execution window."}
          </p>
          {scheduleValidationError ? (
            <p className="error-copy field-span-2">{scheduleValidationError}</p>
          ) : null}
          {updateMutation.isError ? (
            <p className="error-copy field-span-2">{updateMutation.error.message}</p>
          ) : null}
          <div className="field-span-2 form-actions inline-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={updateMutation.isPending || Boolean(scheduleValidationError)}
            >
              {updateMutation.isPending ? "Saving..." : "Save action"}
            </button>
            <button
              className="secondary-button danger-button"
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Delete this action? Its influencer assignments will be removed.",
                  )
                ) {
                  deleteMutation.mutate(action.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete action"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function CampaignMediaSection({
  campaignId,
  campaignStatus,
  canPlan,
}: {
  campaignId: string;
  campaignStatus: string;
  canPlan: boolean;
}) {
  const { assets, isLoading, query } = useCampaignAssets(campaignId);
  const createMutation = useCreateAssetMutation(campaignId);
  const updateMutation = useUpdateAssetMutation(campaignId);
  const deleteMutation = useDeleteAssetMutation(campaignId);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState<typeof assets[0] | null>(null);
  const [editForm, setEditForm] = useState({ name: "", category: "other", tagsInput: "" });

  const isReadOnly = !canPlan || campaignStatus === "completed" || campaignStatus === "archived";

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
    await createMutation.mutateAsync(payload);
  }

  function handleLinkSubmit(payload: {
    name: string;
    description?: string;
    source_type: string;
    file_url: string;
    category: string;
    tags: string[];
  }) {
    createMutation.mutate(payload, {
      onSuccess: () => setShowLinkDialog(false),
    });
  }

  function handleEdit(asset: typeof assets[0]) {
    setEditingAsset(asset);
    setEditForm({
      name: asset.name,
      category: asset.category,
      tagsInput: asset.tags.join(", "),
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAsset) return;
    const tags = editForm.tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    updateMutation.mutate(
      { assetId: editingAsset.id, payload: { name: editForm.name, category: editForm.category, tags } },
      { onSuccess: () => setEditingAsset(null) },
    );
  }

  function handleDelete(asset: typeof assets[0]) {
    deleteMutation.mutate(asset.id);
  }

  return (
    <PageSection eyebrow="Media" title="Media Library">
      {!isReadOnly ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <AssetUploadZone onCreate={handleUploadCreate} />
          <div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setShowLinkDialog(true)}
            >
              Add External Link
            </button>
          </div>
        </div>
      ) : null}

      <MediaLibrary
        assets={assets}
        isLoading={isLoading}
        campaignId={campaignId}
        isReadOnly={isReadOnly}
        onRefresh={() => { void query.refetch(); }}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {showLinkDialog ? (
        <AddExternalLinkDialog
          onSubmit={handleLinkSubmit}
          onClose={() => setShowLinkDialog(false)}
          isPending={createMutation.isPending}
        />
      ) : null}

      {editingAsset ? (
        <div className="confirm-overlay" onClick={() => setEditingAsset(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h3>Edit Asset</h3>
            <form className="form-grid" onSubmit={handleEditSubmit}>
              <label className="field field-span-2">
                <span>Name</span>
                <input
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>Category</span>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {["logo", "brand_guidelines", "product_photo", "video_broll", "copy_caption", "hashtag_list", "mood_board", "template", "font", "color_palette", "other"].map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Tags</span>
                <input
                  placeholder="tag1, tag2"
                  value={editForm.tagsInput}
                  onChange={(e) => setEditForm((f) => ({ ...f, tagsInput: e.target.value }))}
                />
              </label>
              <div className="field-span-2 form-actions">
                <button className="primary-button" type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </button>
                <button className="secondary-button" type="button" onClick={() => setEditingAsset(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </PageSection>
  );
}

export function CampaignDetailPage({ canPlan }: { canPlan: boolean }) {
  const { campaignId } = useParams<{ campaignId: string }>();
  const planningQuery = useCampaignPlanningViewQuery(campaignId);
  const [showMissionForm, setShowMissionForm] = useState(false);
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null);
  const [filters, setFilters] = useState<PlannerActionFilters>({
    status: "all",
    platform: "all",
    staffing: "all",
  });
  const reorderMutation = useReorderMissionMutation(campaignId ?? "");

  if (!campaignId) {
    return (
      <EmptyState
        title="Campaign missing"
        message="Select a campaign from the list."
      />
    );
  }

  if (planningQuery.isLoading) {
    return <p className="muted">Loading campaign planning view...</p>;
  }

  if (planningQuery.isError || !planningQuery.data) {
    return (
      <ErrorState
        message="Campaign planning details could not be loaded."
        onRetry={() => {
          void planningQuery.refetch();
        }}
      />
    );
  }

  const campaign = planningQuery.data;
  const filteredMissions = filterMissionActions(campaign.missions, filters);
  const visibleActionCount = filteredMissions.reduce(
    (total, mission) => total + mission.actions.length,
    0,
  );
  const totalActionCount = campaign.missions.reduce(
    (total, mission) => total + mission.actions.length,
    0,
  );
  const hasActiveFilters =
    filters.status !== "all" ||
    filters.platform !== "all" ||
    filters.staffing !== "all";

  return (
    <div className="page-stack">
      <Link className="breadcrumb-link" to="/campaigns">
        &lt; {campaign.name}
      </Link>

      <CampaignEditor campaign={campaign} canPlan={canPlan} />
      <CampaignInfluencersSection campaign={campaign} onRefresh={() => { void planningQuery.refetch(); }} />
      <CampaignMetricsSection campaign={campaign} />
      <CampaignTimelineSection campaign={campaign} />
      <CampaignMediaSection campaignId={campaign.id} campaignStatus={campaign.status} canPlan={canPlan} />

      {canPlan && campaign.status !== "completed" && campaign.status !== "archived" ? (
        <PageSection
          eyebrow="Mission creation"
          title="Build the next stage"
          actions={
            <button
              className="primary-button"
              type="button"
              onClick={() => setShowMissionForm((value) => !value)}
            >
              {showMissionForm ? "Close" : "Add Mission"}
            </button>
          }
        >
          {showMissionForm ? (
            <MissionForm
              campaignId={campaign.id}
              campaignStartDate={campaign.start_date}
              campaignEndDate={campaign.end_date}
              siblingMissions={campaign.missions}
            />
          ) : (
            <p className="muted">
              Add missions to define the stages of work before staffing creators.
            </p>
          )}
        </PageSection>
      ) : null}

      <PageSection
        eyebrow="Structure"
        title="Missions and actions"
        actions={
          <div className="builder-toolbar">
            <label className="field compact-field">
              <span>Action status</span>
              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value as PlannerActionFilters["status"],
                  }))
                }
              >
                <option value="all">All statuses</option>
                {ACTION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="field compact-field">
              <span>Platform</span>
              <select
                value={filters.platform}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    platform: event.target.value as PlannerActionFilters["platform"],
                  }))
                }
              >
                <option value="all">All platforms</option>
                {SOCIAL_PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </label>
            <label className="field compact-field">
              <span>Staffing</span>
              <select
                value={filters.staffing}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    staffing: event.target.value as PlannerActionFilters["staffing"],
                  }))
                }
              >
                <option value="all">All actions</option>
                <option value="staffed">Staffed only</option>
                <option value="unstaffed">Needs staffing</option>
              </select>
            </label>
            {hasActiveFilters ? (
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  setFilters({
                    status: "all",
                    platform: "all",
                    staffing: "all",
                  })
                }
              >
                Clear filters
              </button>
            ) : null}
          </div>
        }
      >
        <p className="meta-line">
          Showing {visibleActionCount} of {totalActionCount} actions across{" "}
          {campaign.missions.length} mission{campaign.missions.length === 1 ? "" : "s"}.
        </p>
        {reorderMutation.isError ? (
          <p className="error-copy">
            Mission order could not be saved. Try again.
          </p>
        ) : null}

        {campaign.missions.length === 0 ? (
          <EmptyState
            title="No missions yet"
            message="Add the first mission to begin structuring actions and influencer assignments."
          />
        ) : (
          <div className="mission-stack">
            {filteredMissions.map((mission) => {
              const sourceMission = campaign.missions.find(
                (item) => item.id === mission.id,
              );
              const sourceIndex = campaign.missions.findIndex(
                (item) => item.id === mission.id,
              );
              const missionActionCount = sourceMission?.actions.length ?? mission.actions.length;
              const missionAssignmentCount =
                sourceMission?.actions.reduce(
                  (total, action) => total + action.assignments.length,
                  0,
                ) ?? 0;

              return (
                <MissionEditor
                  key={mission.id}
                  campaignId={campaign.id}
                  campaignStatus={campaign.status}
                  mission={mission}
                  canPlan={canPlan}
                  isOpen={expandedMissionId === mission.id}
                  onToggleOpen={() =>
                    setExpandedMissionId((current) =>
                      current === mission.id ? null : mission.id,
                    )
                  }
                  onMoveUp={() =>
                    reorderMutation.mutate({
                      missions: campaign.missions,
                      missionId: mission.id,
                      direction: "up",
                    })
                  }
                  onMoveDown={() =>
                    reorderMutation.mutate({
                      missions: campaign.missions,
                      missionId: mission.id,
                      direction: "down",
                    })
                  }
                  canMoveUp={sourceIndex > 0}
                  canMoveDown={sourceIndex < campaign.missions.length - 1}
                  isReordering={reorderMutation.isPending}
                  totalActionCount={missionActionCount}
                  totalAssignmentCount={missionAssignmentCount}
                  campaignStartDate={campaign.start_date}
                  campaignEndDate={campaign.end_date}
                  siblingMissions={campaign.missions}
                />
              );
            })}
          </div>
        )}
      </PageSection>
    </div>
  );
}
