import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { PageSection } from "../components/PageSection";
import { StarRating } from "../components/StarRating";
import { StatusBadge } from "../components/StatusBadge";
import { useCampaignPlanningViewQuery } from "../hooks/use-campaign-builder";
import {
  ASSIGNMENT_STATUSES,
} from "@influencer-manager/shared/types/mobile";
import {
  useAssignmentPosts,
  useAssignmentRating,
  useCreateRatingMutation,
  useUpdateAssignmentMutation,
  useUpdateRatingMutation,
} from "../hooks/use-influencer-manager";
import { useAuthStore } from "../state/auth-store";
import { formatDate, formatPlatform } from "../utils/format";

function statusTone(status: string): "info" | "success" | "warning" | "danger" {
  if (status === "active" || status === "approved" || status === "completed")
    return "success";
  if (status === "archived") return "warning";
  if (status === "rejected") return "danger";
  if (status === "paused" || status === "draft") return "danger";
  return "info";
}

function AssignmentEditor({
  assignmentId,
  currentStatus,
  currentUrl,
  currentPublishedAt,
}: {
  assignmentId: string;
  currentStatus: string;
  currentUrl: string | null;
  currentPublishedAt: string | null;
}) {
  const mutation = useUpdateAssignmentMutation(assignmentId);
  const [status, setStatus] = useState(currentStatus);
  const [url, setUrl] = useState(currentUrl ?? "");

  const isDirty =
    status !== currentStatus || url !== (currentUrl ?? "");

  function handleSave() {
    mutation.mutate({
      assignment_status: status,
      submission_url: url || null,
      published_at: new Date().toISOString(),
    });
  }

  return (
    <div className="form-grid">
      <label className="field">
        <span>
          Action URL
          {currentUrl ? (
            <>
              {" — "}
              <a
                className="primary-link"
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View
              </a>
            </>
          ) : null}
        </span>
        <input
          type="url"
          value={url}
          placeholder="https://..."
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <label className="field">
        <span>Action Status</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {ASSIGNMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <div className="field-span-2">
        <p className="muted" style={{ fontSize: 13 }}>
          <strong>ACTION PUBLISHED</strong>{" "}
          {currentPublishedAt
            ? new Date(currentPublishedAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : "Not yet published"}
        </p>
      </div>
      {isDirty ? (
        <div className="field form-actions">
          <button
            className="primary-button"
            type="button"
            disabled={mutation.isPending}
            onClick={handleSave}
          >
            {mutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      ) : null}
      {mutation.isError ? (
        <p className="error-copy field-span-2">{mutation.error.message}</p>
      ) : null}
    </div>
  );
}

function MetricsEditor({
  assignmentId,
  currentViews,
  currentComments,
  currentShares,
  metricsUpdatedAt,
}: {
  assignmentId: string;
  currentViews: number;
  currentComments: number;
  currentShares: number;
  metricsUpdatedAt: string | null;
}) {
  const mutation = useUpdateAssignmentMutation(assignmentId);
  const [views, setViews] = useState(String(currentViews));
  const [comments, setComments] = useState(String(currentComments));
  const [shares, setShares] = useState(String(currentShares));
  const [savedAt, setSavedAt] = useState<string | null>(metricsUpdatedAt);

  const isDirty =
    views !== String(currentViews) ||
    comments !== String(currentComments) ||
    shares !== String(currentShares);

  function handleSave() {
    const now = new Date().toISOString();
    mutation.mutate(
      {
        total_views: Number(views) || 0,
        total_comments: Number(comments) || 0,
        total_shares: Number(shares) || 0,
        metrics_updated_at: now,
      },
      { onSuccess: () => setSavedAt(now) },
    );
  }

  return (
    <div className="form-grid">
      <label className="field">
        <span>Total Views</span>
        <input
          type="number"
          min="0"
          value={views}
          onChange={(e) => setViews(e.target.value)}
        />
      </label>
      <label className="field">
        <span>Total Comments</span>
        <input
          type="number"
          min="0"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
      </label>
      <label className="field">
        <span>Total Shares</span>
        <input
          type="number"
          min="0"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
        />
      </label>
      {savedAt ? (
        <div className="field-span-2">
          <p className="muted" style={{ fontSize: 13 }}>
            <strong>METRICS UPDATED</strong>{" "}
            {new Date(savedAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      ) : null}
      {isDirty ? (
        <div className="field form-actions">
          <button
            className="primary-button"
            type="button"
            disabled={mutation.isPending}
            onClick={handleSave}
          >
            {mutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      ) : null}
      {mutation.isError ? (
        <p className="error-copy field-span-2">{mutation.error.message}</p>
      ) : null}
    </div>
  );
}

function RatingSection({
  assignmentId,
  influencerId,
  campaignId,
}: {
  assignmentId: string;
  influencerId: string;
  campaignId: string;
}) {
  const user = useAuthStore((s) => s.user);
  const { rating, isLoading: ratingLoading } =
    useAssignmentRating(assignmentId);
  const createMutation = useCreateRatingMutation();
  const updateMutation = useUpdateRatingMutation(rating?.id ?? "");

  const [form, setForm] = useState<{
    visual_quality_score: number;
    visual_quality_note: string;
    script_quality_score: number;
    script_quality_note: string;
    overall_quality_score: number;
    overall_quality_note: string;
  } | null>(null);

  const current = form ?? {
    visual_quality_score: rating?.visual_quality_score ?? 0,
    visual_quality_note: rating?.visual_quality_note ?? "",
    script_quality_score: rating?.script_quality_score ?? 0,
    script_quality_note: rating?.script_quality_note ?? "",
    overall_quality_score: rating?.overall_quality_score ?? 0,
    overall_quality_note: rating?.overall_quality_note ?? "",
  };

  const isDirty =
    form !== null &&
    (form.visual_quality_score !== (rating?.visual_quality_score ?? 0) ||
      form.visual_quality_note !== (rating?.visual_quality_note ?? "") ||
      form.script_quality_score !== (rating?.script_quality_score ?? 0) ||
      form.script_quality_note !== (rating?.script_quality_note ?? "") ||
      form.overall_quality_score !== (rating?.overall_quality_score ?? 0) ||
      form.overall_quality_note !== (rating?.overall_quality_note ?? ""));

  const saving = createMutation.isPending || updateMutation.isPending;

  function updateField<K extends keyof typeof current>(
    key: K,
    value: (typeof current)[K],
  ) {
    setForm((prev) => ({ ...(prev ?? current), [key]: value }));
  }

  function handleSave() {
    if (!user) return;

    const payload = {
      visual_quality_score: current.visual_quality_score || undefined,
      visual_quality_note: current.visual_quality_note || undefined,
      script_quality_score: current.script_quality_score || undefined,
      script_quality_note: current.script_quality_note || undefined,
      overall_quality_score: current.overall_quality_score || undefined,
      overall_quality_note: current.overall_quality_note || undefined,
    };

    if (rating) {
      updateMutation.mutate(payload, {
        onSuccess: () => setForm(null),
      });
    } else {
      createMutation.mutate(
        {
          influencer_id: influencerId,
          campaign_id: campaignId,
          action_assignment_id: assignmentId,
          rater_user_id: user.id,
          ...payload,
        },
        { onSuccess: () => setForm(null) },
      );
    }
  }

  if (ratingLoading) {
    return <p className="muted">Loading ratings...</p>;
  }

  return (
    <div className="rating-group">
      {rating ? (
        <div className="rating-meta">
          <span>
            <strong>Rated by:</strong>{" "}
            {rating.rater_user?.full_name ?? rating.rater_user?.email ?? "—"}
          </span>
          <span>
            <strong>Date:</strong>{" "}
            {new Date(rating.created_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
      ) : null}

      <div className="rating-row">
        <div className="rating-row-header">
          <label>Visual Quality</label>
          <StarRating
            value={current.visual_quality_score}
            onChange={(v) => updateField("visual_quality_score", v)}
          />
        </div>
        <input
          className="rating-note-input"
          type="text"
          placeholder="Visual quality notes..."
          value={current.visual_quality_note}
          onChange={(e) => updateField("visual_quality_note", e.target.value)}
        />
      </div>

      <div className="rating-row">
        <div className="rating-row-header">
          <label>Script Quality</label>
          <StarRating
            value={current.script_quality_score}
            onChange={(v) => updateField("script_quality_score", v)}
          />
        </div>
        <input
          className="rating-note-input"
          type="text"
          placeholder="Script quality notes..."
          value={current.script_quality_note}
          onChange={(e) => updateField("script_quality_note", e.target.value)}
        />
      </div>

      <div className="rating-row">
        <div className="rating-row-header">
          <label>Overall Quality</label>
          <StarRating
            value={current.overall_quality_score}
            onChange={(v) => updateField("overall_quality_score", v)}
          />
        </div>
        <input
          className="rating-note-input"
          type="text"
          placeholder="Overall quality notes..."
          value={current.overall_quality_note}
          onChange={(e) => updateField("overall_quality_note", e.target.value)}
        />
      </div>

      {isDirty ? (
        <div className="inline-actions">
          <button
            className="primary-button"
            type="button"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "Saving..." : rating ? "Update Rating" : "Save Rating"}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setForm(null)}
          >
            Cancel
          </button>
        </div>
      ) : null}

      {createMutation.isError ? (
        <p className="error-copy">{createMutation.error.message}</p>
      ) : null}
      {updateMutation.isError ? (
        <p className="error-copy">{updateMutation.error.message}</p>
      ) : null}
    </div>
  );
}

export function InfluencerActionDetailPage({
  canPlan,
}: {
  canPlan: boolean;
}) {
  const { influencerId, campaignId, actionId } = useParams<{
    influencerId: string;
    campaignId: string;
    actionId: string;
  }>();

  const campaignQuery = useCampaignPlanningViewQuery(campaignId);
  const campaign = campaignQuery.data ?? null;

  const { action, assignment, mission } = useMemo(() => {
    if (!campaign || !actionId || !influencerId) {
      return { action: null, assignment: null, mission: null };
    }

    for (const m of campaign.missions) {
      for (const a of m.actions) {
        if (a.id === actionId) {
          const foundAssignment = a.assignments.find(
            (asgn) => asgn.influencer_id === influencerId,
          );
          return {
            action: a,
            assignment: foundAssignment ?? null,
            mission: m,
          };
        }
      }
    }

    return { action: null, assignment: null, mission: null };
  }, [campaign, actionId, influencerId]);

  const postsQuery = useAssignmentPosts(assignment?.id);
  const posts = postsQuery.data?.posts ?? [];
  const { rating: existingRating } = useAssignmentRating(assignment?.id);

  const isApprovedOrCompleted =
    assignment?.assignment_status === "approved" ||
    assignment?.assignment_status === "completed";

  const hasFullRating =
    existingRating?.visual_quality_score != null &&
    existingRating?.script_quality_score != null &&
    existingRating?.overall_quality_score != null;

  const ratingAverage =
    isApprovedOrCompleted && hasFullRating
      ? (
          (existingRating.visual_quality_score! +
            existingRating.script_quality_score! +
            existingRating.overall_quality_score!) /
          3
        ).toFixed(1)
      : null;

  if (campaignQuery.isLoading) {
    return (
      <p className="muted" style={{ padding: 32 }}>
        Loading action...
      </p>
    );
  }

  if (campaignQuery.isError || !campaign || !action) {
    return (
      <div style={{ padding: 32 }}>
        <ErrorState
          message="Action could not be loaded."
          onRetry={() => {
            void campaignQuery.refetch();
          }}
        />
      </div>
    );
  }

  const influencerName = assignment?.influencer_summary?.name ?? null;

  return (
    <div className="page-stack">
      {influencerName ? (
        <h1 className="page-heading">
          <Link to={`/influencers/${influencerId}`}>{influencerName}</Link>
        </h1>
      ) : null}

      <PageSection
        eyebrow="Action"
        title={action.title}
        actions={
          <Link
            className="secondary-button"
            to={`/influencers/${influencerId}/campaigns/${campaignId}`}
          >
            Back to campaign
          </Link>
        }
      >
        <div className="detail-fields">
          <div className="detail-field">
            <span className="detail-label">Campaign</span>
            <span>
              <strong>
                <Link to={`/campaigns/${campaignId}`}>{campaign.name}</Link>
              </strong>
            </span>
          </div>
          {mission ? (
            <div className="detail-field">
              <span className="detail-label">Mission</span>
              <span>
                <strong>{mission.name}</strong>
              </span>
            </div>
          ) : null}
          <div className="detail-field">
            <span className="detail-label">Platform</span>
            <span>
              <strong>{formatPlatform(action.platform)}</strong>
            </span>
          </div>
          {action.content_format ? (
            <div className="detail-field">
              <span className="detail-label">Format</span>
              <span>
                <strong>{formatPlatform(action.content_format)}</strong>
              </span>
            </div>
          ) : null}
          <div className="detail-field">
            <span className="detail-label">Action Status</span>
            <StatusBadge
              label={action.status}
              tone={statusTone(action.status)}
            />
          </div>
          {assignment ? (
            <div className="detail-field">
              <span className="detail-label">Assignment Status</span>
              <StatusBadge
                label={assignment.assignment_status}
                tone={statusTone(assignment.assignment_status)}
              />
            </div>
          ) : null}
          {action.start_window || action.end_window ? (
            <div className="detail-field">
              <span className="detail-label">Window</span>
              <span>
                {formatDate(action.start_window)} –{" "}
                {formatDate(action.end_window)}
              </span>
            </div>
          ) : null}
          {assignment?.due_date ? (
            <div className="detail-field">
              <span className="detail-label">Due Date</span>
              <span>{formatDate(assignment.due_date)}</span>
            </div>
          ) : null}
          {action.instructions ? (
            <div className="detail-field">
              <span className="detail-label">Instructions</span>
              <span>{action.instructions}</span>
            </div>
          ) : null}
        </div>
      </PageSection>

      {assignment ? (
        <PageSection eyebrow="Assignment" title="Action details">
          <AssignmentEditor
            assignmentId={assignment.id}
            currentStatus={assignment.assignment_status}
            currentUrl={assignment.submission_url}
            currentPublishedAt={assignment.published_at}
          />
        </PageSection>
      ) : null}

      {assignment ? (
        <PageSection eyebrow="Performance" title="Action metrics">
          <MetricsEditor
            assignmentId={assignment.id}
            currentViews={assignment.total_views}
            currentComments={assignment.total_comments}
            currentShares={assignment.total_shares}
            metricsUpdatedAt={assignment.metrics_updated_at}
          />
        </PageSection>
      ) : null}

      {isApprovedOrCompleted ? (
        <PageSection eyebrow="Media" title="Published media">
          {postsQuery.isLoading ? (
            <p className="muted">Loading posts...</p>
          ) : postsQuery.isError ? (
            <ErrorState
              message="Posts could not be loaded."
              onRetry={() => {
                void postsQuery.query.refetch();
              }}
            />
          ) : posts.length === 0 ? (
            <EmptyState
              title="No published media"
              message="No posts have been linked to this action yet."
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Media Type</th>
                  <th>Posted</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td>{formatPlatform(post.platform)}</td>
                    <td>{formatPlatform(post.media_type)}</td>
                    <td>{formatDate(post.posted_at)}</td>
                    <td>
                      <a
                        href={post.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="secondary-button"
                      >
                        View post
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </PageSection>
      ) : null}

      {assignment && influencerId && campaignId ? (
        <PageSection
          eyebrow="Rating"
          title={
            ratingAverage
              ? `Quality rating — ${ratingAverage} ★`
              : "Quality rating"
          }
        >
          <RatingSection
            assignmentId={assignment.id}
            influencerId={influencerId}
            campaignId={campaignId}
          />
        </PageSection>
      ) : null}
    </div>
  );
}
