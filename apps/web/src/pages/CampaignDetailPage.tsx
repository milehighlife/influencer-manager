import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  ACTION_STATUSES,
  ASSIGNMENT_STATUSES,
  MISSION_STATUSES,
  SOCIAL_PLATFORMS,
} from "@influencer-manager/shared/types/mobile";
import type { CampaignStatus } from "@influencer-manager/shared/types/mobile";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { PageSection } from "../components/PageSection";
import { StatusBadge } from "../components/StatusBadge";
import {
  getLookupHelperMessage,
  useCampaignPlanningViewQuery,
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
  "story_set",
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
  const mutation = useUpdateCampaignMutation(campaign.id);
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

  return (
    <PageSection
      eyebrow="Campaign detail"
      title={campaign.name}
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
          <p className="muted">Status</p>
          <StatusBadge
            label={campaign.status}
            tone={campaign.status === "active" ? "success" : "info"}
          />
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
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate(
              {
                name: form.name,
                start_date: toNullableScheduleValue(form.start_date),
                end_date: toNullableScheduleValue(form.end_date),
                status: form.status,
              },
              {
                onSuccess: () => {
                  setIsEditing(false);
                },
              },
            );
          }}
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

function CampaignTimelineSection({
  campaign,
}: {
  campaign: NonNullable<
    ReturnType<typeof useCampaignPlanningViewQuery>["data"]
  >;
}) {
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
  const [isEditing, setIsEditing] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
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
          <h3>{mission.name}</h3>
          <p className="muted">
            {mission.description || "No mission description yet."}
          </p>
      <p className="meta-line">
        {mission.actions.length} visible action
        {mission.actions.length === 1 ? "" : "s"} of {totalActionCount} total •{" "}
        {totalAssignmentCount} assignment{totalAssignmentCount === 1 ? "" : "s"}
      </p>
      <p className="meta-line">
        Mission schedule: {formatDate(mission.start_date)} to {formatDate(mission.end_date)}
      </p>
        </div>
        <div className="stack-right">
          <StatusBadge
            label={mission.status}
            tone={mission.status === "active" ? "success" : "info"}
          />
          <div className="inline-actions">
            {canPlan ? (
              <>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={onMoveUp}
                  disabled={!canMoveUp || isReordering}
                >
                  Move Up
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={onMoveDown}
                  disabled={!canMoveDown || isReordering}
                >
                  Move Down
                </button>
              </>
            ) : null}
            <button
              className="secondary-button"
              type="button"
              onClick={onToggleOpen}
            >
              {isOpen ? "Collapse" : "Expand"}
            </button>
            {canPlan ? (
              <>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setIsEditing((value) => !value)}
                >
                  {isEditing ? "Close edit" : "Edit"}
                </button>
                <button
                  className="secondary-button danger-button"
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Delete this mission? Its actions and assignments will be removed as part of the mission cleanup.",
                      )
                    ) {
                      deleteMutation.mutate(mission.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <p className="meta-line">
        Window: {formatDate(mission.start_date)} to {formatDate(mission.end_date)}
      </p>
      {deleteMutation.isError ? (
        <p className="error-copy">{deleteMutation.error.message}</p>
      ) : null}

      {isEditing ? (
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

      {isOpen ? (
        <>
          {canPlan ? (
            <div className="builder-toolbar">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setShowActionForm((value) => !value)}
              >
                {showActionForm ? "Close action form" : "Add Action"}
              </button>
            </div>
          ) : null}

          {showActionForm ? (
            <ActionForm
              campaignId={campaignId}
              missionId={mission.id}
              missionStartDate={mission.start_date}
              missionEndDate={mission.end_date}
              siblingActions={mission.actions}
            />
          ) : null}

          {mission.actions.length === 0 ? (
            <EmptyState
              title={totalActionCount === 0 ? "No actions yet" : "No actions match the current filters"}
              message={
                totalActionCount === 0
                  ? "Create the first action to define deliverable expectations and begin staffing creators."
                  : "Try another filter combination to reveal actions in this mission."
              }
            />
          ) : (
            <div className="action-stack">
              {mission.actions.map((action) => (
                <ActionEditor
                  key={action.id}
                  campaignId={campaignId}
                  action={action}
                  canPlan={canPlan}
                  missionStartDate={mission.start_date}
                  missionEndDate={mission.end_date}
                  siblingActions={mission.actions}
                />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function ActionForm({
  campaignId,
  missionId,
  missionStartDate,
  missionEndDate,
  siblingActions,
}: {
  campaignId: string;
  missionId: string;
  missionStartDate: string | null;
  missionEndDate: string | null;
  siblingActions: NonNullable<
    ReturnType<typeof useCampaignPlanningViewQuery>["data"]
  >["missions"][number]["actions"];
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
    siblingActions,
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
  siblingActions,
}: {
  campaignId: string;
  action: NonNullable<
    ReturnType<typeof useCampaignPlanningViewQuery>["data"]
  >["missions"][number]["actions"][number];
  canPlan: boolean;
  missionStartDate: string | null;
  missionEndDate: string | null;
  siblingActions: NonNullable<
    ReturnType<typeof useCampaignPlanningViewQuery>["data"]
  >["missions"][number]["actions"];
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
    actionId: action.id,
    startWindow: form.start_window,
    endWindow: form.end_window,
    missionStartDate,
    missionEndDate,
    siblingActions,
  });

  return (
    <div className="action-card">
      <div className="section-header">
        <div>
          <h4>{action.title}</h4>
          <p className="muted">
            {formatPlatform(action.platform)} • {action.content_format ?? "content"} •{" "}
            {action.required_deliverables} deliverable
            {action.required_deliverables === 1 ? "" : "s"}
          </p>
          <p className="meta-line">
            {action.assignments.length} assigned influencer
            {action.assignments.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="stack-right">
          <StatusBadge
            label={action.status}
            tone={action.status === "active" ? "success" : "info"}
          />
          {canPlan ? (
            <div className="inline-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setShowAssigner((value) => !value)}
              >
                {showAssigner ? "Close assigner" : "Assign Influencer"}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setIsEditing((value) => !value)}
              >
                {isEditing ? "Close edit" : "Edit"}
              </button>
              <button
                className="secondary-button danger-button"
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Delete this action? Its influencer assignments will be removed as part of the action cleanup.",
                    )
                  ) {
                    deleteMutation.mutate(action.id);
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
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
          <div className="field-span-2 form-actions">
            <button
              className="secondary-button"
              type="submit"
              disabled={updateMutation.isPending || Boolean(scheduleValidationError)}
            >
              {updateMutation.isPending ? "Saving..." : "Save action"}
            </button>
          </div>
        </form>
      ) : null}

      {showAssigner ? (
        <AssignmentForm campaignId={campaignId} actionId={action.id} />
      ) : null}

      {action.assignments.length === 0 ? (
        <EmptyState
          title="No influencers assigned"
          message="Assign an influencer to connect execution work to this action."
        />
      ) : (
        <div className="assignment-list">
          {action.assignments.map((assignment) => (
            <div className="assignment-row" key={assignment.id}>
              <div>
                <strong>{assignment.influencer_summary.name}</strong>
                <p className="muted">
                  {assignment.influencer_summary.primary_platform} • Due{" "}
                  {formatDate(assignment.due_date)}
                </p>
              </div>
              <div className="inline-actions">
                <StatusBadge
                  label={assignment.assignment_status}
                  tone={
                    assignment.assignment_status === "completed"
                      ? "success"
                      : assignment.assignment_status === "rejected"
                        ? "danger"
                        : "info"
                  }
                />
                {canPlan ? (
                  <button
                    className="secondary-button danger-button"
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Remove this influencer assignment from the action?",
                        )
                      ) {
                        deleteAssignmentMutation.mutate(assignment.id);
                      }
                    }}
                    disabled={deleteAssignmentMutation.isPending}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
      <CampaignEditor campaign={campaign} canPlan={canPlan} />
      <CampaignTimelineSection campaign={campaign} />

      {canPlan ? (
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
