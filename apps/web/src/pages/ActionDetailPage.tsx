import { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ACTION_STATUSES,
  SOCIAL_PLATFORMS,
} from "@influencer-manager/shared/types/mobile";
import type { Influencer } from "@influencer-manager/shared/types/mobile";
import { BulkCampaignMessageDialog } from "../components/BulkCampaignMessageDialog";
import { ComposeMessageDialog } from "../components/ComposeMessageDialog";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { PageSection } from "../components/PageSection";
import { StatusBadge } from "../components/StatusBadge";
import { useCampaignPlanningViewQuery, useUpdateActionMutation } from "../hooks/use-campaign-builder";
import { actionAssignmentsApi, influencersApi } from "../services/api";
import { formatDate, formatPlatform } from "../utils/format";

const CONTENT_FORMAT_OPTIONS = [
  "in_feed_post", "carousel", "reel", "story", "short_video",
  "long_form_video", "live_stream", "other",
] as const;

function statusTone(status: string): "neutral" | "info" | "primary" | "success" | "warning" | "danger" {
  if (status === "active" || status === "approved" || status === "completed")
    return "success";
  if (status === "submitted") return "primary";
  if (status === "in_progress" || status === "accepted") return "info";
  if (status === "rejected") return "danger";
  if (status === "assigned" || status === "draft") return "neutral";
  return "info";
}

function ActionDetailsSection({
  action,
  mission,
  campaignId,
  campaignName,
  campaignStatus,
}: {
  action: NonNullable<ReturnType<typeof useCampaignPlanningViewQuery>["data"]>["missions"][number]["actions"][number];
  mission: NonNullable<ReturnType<typeof useCampaignPlanningViewQuery>["data"]>["missions"][number] | null;
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
}) {
  const isClosed = campaignStatus === "completed" || campaignStatus === "archived";
  const [editing, setEditing] = useState(false);
  const updateMutation = useUpdateActionMutation(campaignId, action.id);
  const [form, setForm] = useState({
    title: action.title,
    platform: action.platform,
    content_format: action.content_format ?? "reel",
    instructions: action.instructions ?? "",
    start_window: action.start_window ? action.start_window.slice(0, 16) : "",
    end_window: action.end_window ? action.end_window.slice(0, 16) : "",
    status: action.status,
  });

  return (
    <PageSection
      eyebrow="Action"
      title={
        <span className="mission-header">
          {action.title}
          <StatusBadge
            label={action.status}
            tone={statusTone(action.status)}
          />
        </span>
      }
      actions={
        isClosed ? undefined : (
          <button
            className="primary-button"
            type="button"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Close" : "Edit"}
          </button>
        )
      }
    >
      <div className="detail-fields">
        <div className="detail-field">
          <span className="detail-label">Campaign</span>
          <span><strong><Link to={`/campaigns/${campaignId}`}>{campaignName}</Link></strong></span>
        </div>
        {mission ? (
          <div className="detail-field">
            <span className="detail-label">Mission</span>
            <span><strong>{mission.name}</strong></span>
          </div>
        ) : null}
        <div className="detail-field">
          <span className="detail-label">Platform</span>
          <span><strong>{formatPlatform(action.platform)}</strong></span>
        </div>
        {action.content_format ? (
          <div className="detail-field">
            <span className="detail-label">Format</span>
            <span><strong>{formatPlatform(action.content_format)}</strong></span>
          </div>
        ) : null}
        {action.start_window || action.end_window ? (
          <div className="detail-field">
            <span className="detail-label">Window</span>
            <span>
              {formatDate(action.start_window, { mode: "datetime" })} –{" "}
              {formatDate(action.end_window, { mode: "datetime" })}
            </span>
          </div>
        ) : null}
      </div>
      {action.instructions ? (
        <p className="muted" style={{ marginTop: 12 }}>{action.instructions}</p>
      ) : null}

      {editing && !isClosed ? (
        <form
          className="form-grid compact-form"
          style={{ marginTop: 16 }}
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate(
              {
                title: form.title,
                platform: form.platform as typeof SOCIAL_PLATFORMS[number],
                content_format: form.content_format,
                instructions: form.instructions || undefined,
                start_window: form.start_window || null,
                end_window: form.end_window || null,
                status: form.status as typeof ACTION_STATUSES[number],
              },
              { onSuccess: () => setEditing(false) },
            );
          }}
        >
          <label className="field">
            <span>Title</span>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </label>
          <label className="field">
            <span>Platform</span>
            <select value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value as typeof SOCIAL_PLATFORMS[number] }))}>
              {SOCIAL_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Content format</span>
            <select value={form.content_format} onChange={(e) => setForm((f) => ({ ...f, content_format: e.target.value }))}>
              {CONTENT_FORMAT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as typeof ACTION_STATUSES[number] }))}>
              {ACTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Start window</span>
            <input type="datetime-local" value={form.start_window} onChange={(e) => setForm((f) => ({ ...f, start_window: e.target.value }))} />
          </label>
          <label className="field">
            <span>End window</span>
            <input type="datetime-local" value={form.end_window} onChange={(e) => setForm((f) => ({ ...f, end_window: e.target.value }))} />
          </label>
          <label className="field field-span-2">
            <span>Instructions</span>
            <textarea rows={3} value={form.instructions} onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))} />
          </label>
          {updateMutation.isError ? (
            <p className="error-copy field-span-2">{updateMutation.error.message}</p>
          ) : null}
          <div className="field-span-2 form-actions inline-actions">
            <button className="primary-button" type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </button>
            <button className="secondary-button" type="button" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : null}
    </PageSection>
  );
}

export function ActionDetailPage() {
  const { campaignId, actionId } = useParams<{
    campaignId: string;
    actionId: string;
  }>();

  const campaignQuery = useCampaignPlanningViewQuery(campaignId);
  const campaign = campaignQuery.data ?? null;

  const { action, mission } = useMemo(() => {
    if (!campaign || !actionId) return { action: null, mission: null };

    for (const m of campaign.missions) {
      for (const a of m.actions) {
        if (a.id === actionId) {
          return { action: a, mission: m };
        }
      }
    }

    return { action: null, mission: null };
  }, [campaign, actionId]);

  if (campaignQuery.isLoading) {
    return <p className="muted" style={{ padding: 32 }}>Loading action...</p>;
  }

  if (campaignQuery.isError || !campaign || !action) {
    return (
      <div style={{ padding: 32 }}>
        <ErrorState
          message="Action could not be loaded."
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

      <ActionDetailsSection
        action={action}
        mission={mission}
        campaignId={campaignId!}
        campaignName={campaign.name}
        campaignStatus={campaign.status}
      />

      <AssignmentsSection
        action={action}
        campaignId={campaignId!}
        campaignName={campaign.name}
        clientId={campaign.company.client_id}
        campaignStatus={campaign.status}
      />
    </div>
  );
}

type AssignSortCol = "influencer" | "status" | "url" | "views" | "comments" | "shares";

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  isPending,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-dialog-actions">
          <button className="secondary-button" type="button" onClick={onCancel} disabled={isPending}>
            Cancel
          </button>
          <button className="danger-button primary-button" type="button" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Removing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignmentsEditMode({
  action,
  campaignId,
  clientId,
  onClose,
}: {
  action: NonNullable<ReturnType<typeof useCampaignPlanningViewQuery>["data"]>["missions"][number]["actions"][number];
  campaignId: string;
  clientId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const assignedIds = useMemo(
    () => new Set(action.assignments.map((a) => a.influencer_id)),
    [action.assignments],
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set(assignedIds));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientInfluencersQuery = useQuery({
    queryKey: ["web", "influencers", "by-client-platform", clientId, action.platform],
    queryFn: () => influencersApi.listByClientAndPlatform(clientId, action.platform),
    enabled: Boolean(clientId),
  });

  const allInfluencers: Influencer[] = clientInfluencersQuery.data ?? [];

  const toggleInfluencer = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const toAdd = [...selected].filter((id) => !assignedIds.has(id));
      const toRemove = action.assignments.filter((a) => !selected.has(a.influencer_id));

      await Promise.all([
        ...toAdd.map((influencer_id) =>
          actionAssignmentsApi.createForAction(action.id, { influencer_id }),
        ),
        ...toRemove.map((a) => actionAssignmentsApi.remove(a.id)),
      ]);

      await queryClient.invalidateQueries({
        queryKey: ["web", "campaigns", campaignId],
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update assignments.");
    } finally {
      setSaving(false);
    }
  }, [selected, assignedIds, action, campaignId, queryClient, onClose]);

  const hasChanges = useMemo(() => {
    if (selected.size !== assignedIds.size) return true;
    for (const id of selected) {
      if (!assignedIds.has(id)) return true;
    }
    return false;
  }, [selected, assignedIds]);

  return (
    <>
      {clientInfluencersQuery.isLoading ? (
        <p className="muted">Loading influencers...</p>
      ) : allInfluencers.length === 0 ? (
        <p className="muted">No influencers are linked to this client.</p>
      ) : (
        <div className="checkbox-list">
          {allInfluencers.map((inf) => (
            <label className="checkbox-item" key={inf.id}>
              <input
                type="checkbox"
                checked={selected.has(inf.id)}
                onChange={() => toggleInfluencer(inf.id)}
                disabled={saving}
              />
              <span>{inf.name}</span>
            </label>
          ))}
        </div>
      )}
      {error ? <p className="error-copy">{error}</p> : null}
      <div className="inline-actions" style={{ marginTop: 16 }}>
        <button
          className="primary-button"
          type="button"
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>
          Cancel
        </button>
      </div>
    </>
  );
}

function AssignmentsSection({
  action,
  campaignId,
  campaignName,
  clientId,
  campaignStatus,
}: {
  action: NonNullable<ReturnType<typeof useCampaignPlanningViewQuery>["data"]>["missions"][number]["actions"][number];
  campaignId: string;
  campaignName: string;
  clientId: string;
  campaignStatus: string;
}) {
  const isClosed = campaignStatus === "completed" || campaignStatus === "archived";
  const queryClient = useQueryClient();
  const [sortCol, setSortCol] = useState<AssignSortCol>("influencer");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [editMode, setEditMode] = useState(false);
  const [showBulkMessage, setShowBulkMessage] = useState(false);
  const [messagingInfluencer, setMessagingInfluencer] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{
    assignmentId: string;
    influencerName: string;
  } | null>(null);

  const removeMutation = useMutation({
    mutationFn: (assignmentId: string) => actionAssignmentsApi.remove(assignmentId),
    onSuccess: async () => {
      setConfirmRemove(null);
      await queryClient.invalidateQueries({
        queryKey: ["web", "campaigns", campaignId],
      });
    },
  });

  function handleSort(col: AssignSortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...action.assignments].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortCol) {
        case "influencer":
          av = a.influencer_summary.name.toLowerCase();
          bv = b.influencer_summary.name.toLowerCase();
          break;
        case "status":
          av = a.assignment_status;
          bv = b.assignment_status;
          break;
        case "url":
          av = a.submission_url ?? "";
          bv = b.submission_url ?? "";
          break;
        case "views":
          av = a.total_views ?? 0;
          bv = b.total_views ?? 0;
          break;
        case "comments":
          av = a.total_comments ?? 0;
          bv = b.total_comments ?? 0;
          break;
        case "shares":
          av = a.total_shares ?? 0;
          bv = b.total_shares ?? 0;
          break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [action.assignments, sortCol, sortDir]);

  function SortTh({ label, col }: { label: string; col: AssignSortCol }) {
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
    <PageSection
      eyebrow="Assignments"
      title="Assigned influencers"
      actions={
        <div className="inline-actions">
          {action.assignments.length > 0 ? (
            <button
              className="secondary-button"
              type="button"
              onClick={() => setShowBulkMessage(true)}
            >
              Message All
            </button>
          ) : null}
          {!editMode && !isClosed ? (
            <button
              className="primary-button"
              type="button"
              onClick={() => setEditMode(true)}
            >
              Edit
            </button>
          ) : null}
        </div>
      }
    >
      {editMode ? (
        <AssignmentsEditMode
          action={action}
          campaignId={campaignId}
          clientId={clientId}
          onClose={() => setEditMode(false)}
        />
      ) : action.assignments.length === 0 ? (
        <EmptyState
          title="No influencers assigned"
          message="No influencers have been assigned to this action."
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <SortTh label="Influencer" col="influencer" />
              <SortTh label="Status" col="status" />
              <SortTh label="Media" col="url" />
              <SortTh label="Views" col="views" />
              <SortTh label="Comments" col="comments" />
              <SortTh label="Shares" col="shares" />
              {isClosed ? null : <th className="remove-cell" />}
            </tr>
          </thead>
          <tbody>
            {sorted.map((assignment) => (
              <tr key={assignment.id}>
                <td>
                  <Link to={`/influencers/${assignment.influencer_id}`}>
                    {assignment.influencer_summary.name}
                  </Link>
                </td>
                <td>
                  <StatusBadge
                    label={assignment.assignment_status}
                    tone={statusTone(assignment.assignment_status)}
                  />
                </td>
                <td>
                  {assignment.submission_url ? (
                    <a
                      className="primary-link"
                      href={assignment.submission_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{(assignment.total_views ?? 0).toLocaleString()}</td>
                <td>{(assignment.total_comments ?? 0).toLocaleString()}</td>
                <td>{(assignment.total_shares ?? 0).toLocaleString()}</td>
                {isClosed ? null : (
                  <td className="remove-cell">
                    <div className="inline-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        style={{ fontSize: 12, padding: "4px 10px" }}
                        onClick={() =>
                          setMessagingInfluencer({
                            id: assignment.influencer_id,
                            name: assignment.influencer_summary.name,
                          })
                        }
                      >
                        Message
                      </button>
                      <button
                        className="remove-button"
                        type="button"
                        onClick={() =>
                          setConfirmRemove({
                            assignmentId: assignment.id,
                            influencerName: assignment.influencer_summary.name,
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {confirmRemove ? (
        <ConfirmDialog
          title="Remove influencer"
          message={`Remove ${confirmRemove.influencerName} from this action?`}
          confirmLabel="Remove"
          isPending={removeMutation.isPending}
          onConfirm={() => removeMutation.mutate(confirmRemove.assignmentId)}
          onCancel={() => {
            if (!removeMutation.isPending) {
              setConfirmRemove(null);
            }
          }}
        />
      ) : null}

      {messagingInfluencer ? (
        <ComposeMessageDialog
          influencerId={messagingInfluencer.id}
          influencerName={messagingInfluencer.name}
          defaultSubject={`${campaignName} - ${action.title}`}
          relatedEntityType="action"
          relatedEntityId={action.id}
          onClose={() => setMessagingInfluencer(null)}
          onSuccess={() => setMessagingInfluencer(null)}
        />
      ) : null}

      {showBulkMessage ? (
        <BulkCampaignMessageDialog
          campaignId={campaignId}
          campaignName={`${campaignName} - ${action.title}`}
          influencerIds={action.assignments.map((a) => a.influencer_id)}
          influencerCount={action.assignments.length}
          onClose={() => setShowBulkMessage(false)}
          onSuccess={() => setShowBulkMessage(false)}
        />
      ) : null}
    </PageSection>
  );
}
