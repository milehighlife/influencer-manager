import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assignmentsApi } from "../services/api";
import type {
  InfluencerWorkspaceAssignment,
  InfluencerWorkspaceDeliverable,
} from "@influencer-manager/shared/types/mobile";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_STEPS = ["accepted", "in_progress", "submitted", "approved"] as const;

function stepState(current: string, step: string): "done" | "active" | "upcoming" {
  const ci = STATUS_STEPS.indexOf(current as (typeof STATUS_STEPS)[number]);
  const si = STATUS_STEPS.indexOf(step as (typeof STATUS_STEPS)[number]);

  if (ci < 0) {
    // "assigned" or "rejected" — nothing done yet
    if (current === "rejected") {
      // treat as in_progress for resubmit flow
      const rejIdx = STATUS_STEPS.indexOf("in_progress");
      if (si < rejIdx) return "done";
      if (si === rejIdx) return "active";
      return "upcoming";
    }
    return "upcoming";
  }
  if (si < ci) return "done";
  if (si === ci) return "active";
  return "upcoming";
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function categoryLabel(cat: string): string {
  return cat
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({ status }: { status: string }) {
  return (
    <div className="progress-bar">
      {STATUS_STEPS.map((step) => {
        const state = stepState(status, step);
        let cls = "progress-step";
        if (state === "done") cls += " progress-step-done";
        if (state === "active") cls += " progress-step-active";
        return <div key={step} className={cls} title={step.replace(/_/g, " ")} />;
      })}
    </div>
  );
}

function AssetSection({
  title,
  assets,
}: {
  title: string;
  assets: Array<{
    id: string;
    name: string;
    description: string | null;
    file_url: string;
    thumbnail_url: string | null;
    category: string;
  }>;
}) {
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());

  if (assets.length === 0) return null;

  const grouped = assets.reduce<Record<string, typeof assets>>((acc, asset) => {
    const cat = asset.category || "other";
    (acc[cat] ??= []).push(asset);
    return acc;
  }, {});

  function toggleCat(cat: string) {
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  return (
    <div className="section">
      <h2 className="section-title">{title}</h2>
      {Object.entries(grouped).map(([cat, items]) => {
        const open = openCats.has(cat);
        return (
          <div key={cat}>
            <div
              className="collapsible-header"
              role="button"
              tabIndex={0}
              onClick={() => toggleCat(cat)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleCat(cat);
                }
              }}
            >
              <span>
                {categoryLabel(cat)} ({items.length})
              </span>
              <span className={`collapsible-arrow${open ? " collapsible-arrow-open" : ""}`}>
                &#9660;
              </span>
            </div>
            {open &&
              items.map((asset) => (
                <div className="asset-row" key={asset.id}>
                  <div className="asset-thumb">
                    {asset.thumbnail_url ? (
                      <img src={asset.thumbnail_url} alt="" />
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-tertiary)" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="m3 16 5-5 4 4 4-4 5 5" />
                      </svg>
                    )}
                  </div>
                  <div className="asset-info">
                    <p className="asset-name">{asset.name}</p>
                    {asset.description && (
                      <p className="asset-desc">{asset.description}</p>
                    )}
                  </div>
                  <a
                    href={asset.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: "8px 14px", minHeight: 36, fontSize: 13 }}
                  >
                    Open
                  </a>
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}

function DeliverableRow({
  deliverable,
  onSubmitUrl,
  submitting,
}: {
  deliverable: InfluencerWorkspaceDeliverable;
  onSubmitUrl: (id: string, url: string) => void;
  submitting: boolean;
}) {
  const [url, setUrl] = useState("");

  const hasUrl = !!deliverable.submission_url;

  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          {deliverable.deliverable_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>
        <span
          className={`chip ${
            deliverable.status === "approved"
              ? "chip-success"
              : deliverable.status === "rejected"
                ? "chip-danger"
                : deliverable.status === "submitted"
                  ? "chip-primary"
                  : "chip-neutral"
          }`}
        >
          {deliverable.status}
        </span>
      </div>

      {hasUrl && (
        <a
          href={deliverable.submission_url!}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 13, color: "var(--color-primary)", wordBreak: "break-all" }}
        >
          {deliverable.submission_url}
        </a>
      )}

      {!hasUrl && deliverable.status === "pending" && (
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <input
            type="url"
            placeholder="Paste URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{
              flex: 1,
              padding: "10px 12px",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 14,
            }}
          />
          <button
            className="btn btn-primary"
            style={{ padding: "8px 16px", minHeight: 40, fontSize: 13 }}
            disabled={!url.trim() || submitting}
            onClick={() => {
              if (url.trim()) onSubmitUrl(deliverable.id, url.trim());
            }}
          >
            Add URL
          </button>
        </div>
      )}

      {deliverable.rejection_reason && (
        <p style={{ fontSize: 13, color: "var(--color-danger)", marginTop: 4 }}>
          Rejection: {deliverable.rejection_reason}
        </p>
      )}
    </div>
  );
}

function CampaignBriefSheet({
  assignment,
  onClose,
}: {
  assignment: InfluencerWorkspaceAssignment;
  onClose: () => void;
}) {
  const campaign = assignment.action.mission.campaign;
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>{campaign.name}</h2>
        {campaign.description && (
          <p style={{ margin: "0 0 12px", fontSize: 15, color: "var(--color-ink-secondary)" }}>
            {campaign.description}
          </p>
        )}
        <div style={{ display: "flex", gap: 16, fontSize: 14, color: "var(--color-ink-secondary)" }}>
          <span>Start: {formatDate(campaign.start_date)}</span>
          <span>End: {formatDate(campaign.end_date)}</span>
        </div>
        <div style={{ marginTop: 8 }}>
          <span className="chip chip-neutral">{campaign.status}</span>
        </div>
        <button
          className="btn btn-secondary btn-full"
          style={{ marginTop: 20 }}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ActionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showBrief, setShowBrief] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["assignment", id],
    queryFn: () => assignmentsApi.get(id!),
    enabled: !!id,
  });

  const { data: assetsData } = useQuery({
    queryKey: ["assignment-assets", id],
    queryFn: () => assignmentsApi.getCampaignAssets(id!),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["assignment", id] });
    queryClient.invalidateQueries({ queryKey: ["assignments"] });
  };

  const acceptMutation = useMutation({
    mutationFn: () => assignmentsApi.accept(id!),
    onSuccess: invalidate,
    onError: (err: Error) => setActionError(err.message),
  });

  const startMutation = useMutation({
    mutationFn: () => assignmentsApi.start(id!),
    onSuccess: invalidate,
    onError: (err: Error) => setActionError(err.message),
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      const deliverables = (data?.deliverables ?? [])
        .filter((d) => d.submission_url)
        .map((d) => ({
          deliverable_type: d.deliverable_type,
          submission_url: d.submission_url!,
        }));
      return assignmentsApi.submit(id!, deliverables);
    },
    onSuccess: invalidate,
    onError: (err: Error) => setActionError(err.message),
  });

  const submitUrlMutation = useMutation({
    mutationFn: ({ type, url }: { type: string; url: string }) =>
      assignmentsApi.submit(id!, [{ deliverable_type: type, submission_url: url }]),
    onSuccess: invalidate,
    onError: (err: Error) => setActionError(err.message),
  });

  if (isLoading || !data) {
    return (
      <>
        <button className="back-btn" onClick={() => navigate("/")}>
          &#8592; Back
        </button>
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </>
    );
  }

  const { assignment, deliverables } = data;
  const action = assignment.action;
  const campaign = action.mission.campaign;
  const status = assignment.assignment_status;

  const submittedCount = deliverables.filter(
    (d) => d.status !== "pending",
  ).length;
  const totalDeliverables = action.required_deliverables || deliverables.length;

  const isBusy =
    acceptMutation.isPending ||
    startMutation.isPending ||
    submitMutation.isPending;

  function handleSubmitUrl(deliverableId: string, url: string) {
    const del = deliverables.find((d) => d.id === deliverableId);
    if (!del) return;
    submitUrlMutation.mutate({ type: del.deliverable_type, url });
  }

  function canSubmit(): boolean {
    if (status !== "in_progress") return false;
    const requiredCount = action.required_deliverables || 0;
    const filledCount = deliverables.filter((d) => d.submission_url).length;
    return filledCount >= requiredCount;
  }

  return (
    <>
      <button className="back-btn" onClick={() => navigate("/")}>
        &#8592; Back
      </button>

      {/* Progress */}
      <ProgressBar status={status} />

      {/* Instructions */}
      <div className="section">
        <h1 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>{action.title}</h1>

        <p style={{ margin: "0 0 10px", fontSize: 14, color: "var(--color-ink-secondary)" }}>
          <span
            role="button"
            tabIndex={0}
            style={{ color: "var(--color-primary)", cursor: "pointer", fontWeight: 600 }}
            onClick={() => setShowBrief(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowBrief(true);
              }
            }}
          >
            {campaign.name}
          </span>
        </p>

        <div className="action-card-row" style={{ marginBottom: 12 }}>
          <span className="chip chip-neutral">{action.platform}</span>
          {action.content_format && (
            <span className="chip chip-neutral">{action.content_format}</span>
          )}
        </div>

        <div style={{ fontSize: 14, color: "var(--color-ink-secondary)", marginBottom: 12 }}>
          Due: {formatDate(assignment.due_date)}
        </div>

        {action.instructions && (
          <p style={{ margin: "0 0 10px", fontSize: 15, lineHeight: 1.6 }}>
            {action.instructions}
          </p>
        )}

        <p style={{ margin: 0, fontSize: 13, color: "var(--color-ink-tertiary)" }}>
          {totalDeliverables} deliverable{totalDeliverables !== 1 ? "s" : ""} required
        </p>
      </div>

      {/* Campaign Media */}
      {assetsData && (
        <>
          <AssetSection title="Media for This Action" assets={assetsData.action_assets} />
          <AssetSection title="All Campaign Media" assets={assetsData.campaign_assets} />
        </>
      )}

      {/* Deliverables */}
      <div className="section">
        <h2 className="section-title">
          Deliverables ({submittedCount} of {totalDeliverables} submitted)
        </h2>
        {deliverables.map((d) => (
          <DeliverableRow
            key={d.id}
            deliverable={d}
            onSubmitUrl={handleSubmitUrl}
            submitting={submitUrlMutation.isPending}
          />
        ))}
      </div>

      {/* Error display */}
      {actionError && (
        <p style={{ color: "var(--color-danger)", fontSize: 13, textAlign: "center", marginBottom: 12 }}>
          {actionError}
        </p>
      )}

      {/* Fixed CTA */}
      <div className="fixed-cta">
        {status === "assigned" && (
          <button
            className="btn btn-primary btn-full"
            disabled={isBusy}
            onClick={() => acceptMutation.mutate()}
          >
            {acceptMutation.isPending ? "Accepting..." : "Accept Assignment"}
          </button>
        )}

        {status === "accepted" && (
          <button
            className="btn btn-primary btn-full"
            disabled={isBusy}
            onClick={() => startMutation.mutate()}
          >
            {startMutation.isPending ? "Starting..." : "Start Work"}
          </button>
        )}

        {status === "in_progress" && (
          <button
            className="btn btn-primary btn-full"
            disabled={isBusy || !canSubmit()}
            onClick={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? "Submitting..." : "Submit for Review"}
          </button>
        )}

        {status === "submitted" && (
          <div className="chip chip-info" style={{ width: "100%", justifyContent: "center", padding: "14px 0", fontSize: 15 }}>
            Under Review
          </div>
        )}

        {status === "approved" && (
          <div className="chip chip-success" style={{ width: "100%", justifyContent: "center", padding: "14px 0", fontSize: 15 }}>
            Approved
          </div>
        )}

        {status === "rejected" && (
          <button
            className="btn btn-primary btn-full"
            disabled={isBusy}
            onClick={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? "Resubmitting..." : "Resubmit"}
          </button>
        )}
      </div>

      {/* Campaign Brief Sheet */}
      {showBrief && (
        <CampaignBriefSheet
          assignment={assignment}
          onClose={() => setShowBrief(false)}
        />
      )}
    </>
  );
}
