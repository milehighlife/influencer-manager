import type {
  ActionStatus,
  CampaignStatus,
  CampaignPlanningView,
  Influencer,
  PlanningViewAction,
  PlanningViewMission,
} from "@influencer-manager/shared/types/mobile";

export function filterInfluencers(
  influencers: Influencer[],
  searchTerm: string,
) {
  const normalized = searchTerm.trim().toLowerCase();
  if (!normalized) {
    return influencers;
  }

  return influencers.filter((influencer) =>
    [
      influencer.name,
      influencer.handle ?? "",
      influencer.email ?? "",
      influencer.primary_platform,
      influencer.location ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}

const CAMPAIGN_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ["planned"],
  planned: ["active", "archived"],
  active: ["paused", "completed"],
  paused: ["active"],
  completed: ["archived"],
  archived: [],
};

const ACTION_TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
  draft: ["scheduled"],
  scheduled: ["active"],
  active: ["awaiting_submission", "completed"],
  awaiting_submission: ["under_review"],
  under_review: ["active", "completed"],
  completed: [],
};

export function getCampaignStatusOptions(currentStatus: CampaignStatus) {
  return [currentStatus, ...CAMPAIGN_TRANSITIONS[currentStatus]].filter(
    (value, index, array) => array.indexOf(value) === index,
  );
}

export function getActionStatusOptions(currentStatus: ActionStatus) {
  return [currentStatus, ...ACTION_TRANSITIONS[currentStatus]].filter(
    (value, index, array) => array.indexOf(value) === index,
  );
}

export type MissionReorderDirection = "up" | "down";

export interface MissionSequenceUpdate {
  id: string;
  sequence_order: number;
}

export function buildMissionSequenceUpdates(
  missions: PlanningViewMission[],
  missionId: string,
  direction: MissionReorderDirection,
): MissionSequenceUpdate[] {
  const ordered = [...missions].sort(
    (left, right) => left.sequence_order - right.sequence_order,
  );
  const currentIndex = ordered.findIndex((mission) => mission.id === missionId);
  if (currentIndex === -1) {
    return [];
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= ordered.length) {
    return [];
  }

  const reordered = [...ordered];
  const [mission] = reordered.splice(currentIndex, 1);
  reordered.splice(targetIndex, 0, mission);

  return reordered
    .map((item, index) => ({
      id: item.id,
      sequence_order: index + 1,
    }))
    .filter((item) => {
      const existing = ordered.find((missionItem) => missionItem.id === item.id);
      return existing?.sequence_order !== item.sequence_order;
    });
}

export type ActionStaffingFilter = "all" | "staffed" | "unstaffed";

export interface PlannerActionFilters {
  status: "all" | PlanningViewAction["status"];
  platform: "all" | PlanningViewAction["platform"];
  staffing: ActionStaffingFilter;
}

export function filterMissionActions(
  missions: PlanningViewMission[],
  filters: PlannerActionFilters,
) {
  return missions.map((mission) => ({
    ...mission,
    actions: mission.actions.filter((action) => {
      const statusMatches =
        filters.status === "all" || action.status === filters.status;
      const platformMatches =
        filters.platform === "all" || action.platform === filters.platform;
      const staffingMatches =
        filters.staffing === "all" ||
        (filters.staffing === "staffed"
          ? action.assignments.length > 0
          : action.assignments.length === 0);

      return statusMatches && platformMatches && staffingMatches;
    }),
  }));
}

export interface MissionScheduleValidationInput {
  missionId?: string;
  sequenceOrder?: number;
  startDate?: string;
  endDate?: string;
  campaignStartDate?: string | null;
  campaignEndDate?: string | null;
  siblingMissions?: PlanningViewMission[];
}

export interface CampaignScheduleValidationInput {
  startDate?: string;
  endDate?: string;
  missions?: PlanningViewMission[];
}

export function toNullableScheduleValue(value?: string) {
  const normalized = value?.trim() ?? "";
  return normalized === "" ? null : normalized;
}

export function validateCampaignSchedule({
  startDate,
  endDate,
  missions = [],
}: CampaignScheduleValidationInput) {
  const normalizedStart = startDate?.trim() ?? "";
  const normalizedEnd = endDate?.trim() ?? "";

  if (normalizedStart && normalizedEnd && normalizedStart > normalizedEnd) {
    return "Campaign start date must be on or before the campaign end date.";
  }

  for (const mission of missions) {
    const missionStart = mission.start_date?.slice(0, 10) ?? "";
    const missionEnd = mission.end_date?.slice(0, 10) ?? "";

    const startsBeforeCampaign =
      normalizedStart &&
      ((missionStart && missionStart < normalizedStart) ||
        (missionEnd && missionEnd < normalizedStart));
    const endsAfterCampaign =
      normalizedEnd &&
      ((missionStart && missionStart > normalizedEnd) ||
        (missionEnd && missionEnd > normalizedEnd));

    if (startsBeforeCampaign || endsAfterCampaign) {
      return `Campaign dates must include mission "${mission.name}" from ${
        missionStart || "Not set"
      } to ${missionEnd || "Not set"}.`;
    }
  }

  return null;
}

export function validateMissionSchedule({
  missionId,
  sequenceOrder,
  startDate,
  endDate,
  campaignStartDate,
  campaignEndDate,
  siblingMissions = [],
}: MissionScheduleValidationInput) {
  const normalizedStart = startDate?.trim() ?? "";
  const normalizedEnd = endDate?.trim() ?? "";

  if (normalizedStart && normalizedEnd && normalizedStart > normalizedEnd) {
    return "Mission start date must be on or before the mission end date.";
  }

  if (campaignStartDate && normalizedStart && normalizedStart < campaignStartDate.slice(0, 10)) {
    return "Mission start date must stay within the campaign date window.";
  }

  if (campaignEndDate && normalizedEnd && normalizedEnd > campaignEndDate.slice(0, 10)) {
    return "Mission end date must stay within the campaign date window.";
  }

  if (campaignStartDate && normalizedEnd && normalizedEnd < campaignStartDate.slice(0, 10)) {
    return "Mission end date cannot be earlier than the campaign start date.";
  }

  if (campaignEndDate && normalizedStart && normalizedStart > campaignEndDate.slice(0, 10)) {
    return "Mission start date cannot be later than the campaign end date.";
  }

  return null;
}

/**
 * Validates that an action's date window fits within the parent mission window.
 * Actions are allowed to overlap with each other — no sibling comparison is done.
 */
export function validateActionWindow(input: {
  startWindow?: string;
  endWindow?: string;
  missionStartDate?: string | null;
  missionEndDate?: string | null;
}): string | null {
  const start = input.startWindow?.trim() ?? "";
  const end = input.endWindow?.trim() ?? "";
  const mStart = input.missionStartDate?.slice(0, 10) ?? "";
  const mEnd = input.missionEndDate?.slice(0, 10) ?? "";

  if (start && end && start > end) {
    return "Action start must be on or before the end date.";
  }

  const startDate = start.slice(0, 10);
  const endDate = end.slice(0, 10);

  if (mStart && startDate && startDate < mStart) {
    return `Action start date is before the mission window (${mStart}).`;
  }

  if (mEnd && endDate && endDate > mEnd) {
    return `Action end date is after the mission window (${mEnd}).`;
  }

  return null;
}

export type TimelineScheduleState = "scheduled" | "partial" | "unscheduled";

export interface TimelineBar {
  leftPercent: number;
  widthPercent: number;
}

export interface CampaignTimelineActionItem {
  id: string;
  title: string;
  scheduleState: TimelineScheduleState;
  startWindow: string | null;
  endWindow: string | null;
  bar: TimelineBar | null;
}

export interface CampaignTimelineMissionItem {
  id: string;
  name: string;
  sequenceOrder: number;
  scheduleState: TimelineScheduleState;
  startDate: string | null;
  endDate: string | null;
  actionCount: number;
  scheduledActionCount: number;
  gapBeforeDays: number | null;
  bar: TimelineBar | null;
  actions: CampaignTimelineActionItem[];
}

export interface CampaignTimelineView {
  frameStart: string | null;
  frameEnd: string | null;
  frameSource: "campaign" | "derived" | "none";
  missions: CampaignTimelineMissionItem[];
}

export function getTimelineScheduleLabel(scheduleState: TimelineScheduleState) {
  if (scheduleState === "scheduled") {
    return "Scheduled";
  }

  if (scheduleState === "partial") {
    return "Partial schedule";
  }

  return "Unscheduled";
}

function getScheduleState(startValue?: string | null, endValue?: string | null): TimelineScheduleState {
  if (startValue && endValue) {
    return "scheduled";
  }

  if (startValue || endValue) {
    return "partial";
  }

  return "unscheduled";
}

function toTimestamp(value?: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function computeTimelineBar(
  startValue: string | null,
  endValue: string | null,
  frameStartMs: number | null,
  frameEndMs: number | null,
) {
  if (!startValue || !endValue || frameStartMs === null || frameEndMs === null) {
    return null;
  }

  const startMs = toTimestamp(startValue);
  const endMs = toTimestamp(endValue);
  if (startMs === null || endMs === null) {
    return null;
  }

  const total = Math.max(frameEndMs - frameStartMs, 1);
  const leftPercent = ((startMs - frameStartMs) / total) * 100;
  const widthPercent = Math.max(((endMs - startMs) / total) * 100, 2);

  return {
    leftPercent: Math.max(0, Math.min(leftPercent, 100)),
    widthPercent: Math.max(2, Math.min(widthPercent, 100)),
  };
}

export function buildCampaignTimeline(
  campaign: CampaignPlanningView,
): CampaignTimelineView {
  const orderedMissions = [...campaign.missions].sort(
    (left, right) => left.sequence_order - right.sequence_order,
  );

  const missionDates = orderedMissions.flatMap((mission) =>
    [mission.start_date, mission.end_date].filter(Boolean) as string[],
  );
  const actionDates = orderedMissions.flatMap((mission) =>
    mission.actions.flatMap((action) =>
      [action.start_window, action.end_window].filter(Boolean) as string[],
    ),
  );
  const derivedDates = [...missionDates, ...actionDates];

  const frameStart =
    campaign.start_date ??
    (derivedDates.length > 0
      ? [...derivedDates].sort((left, right) => left.localeCompare(right))[0]
      : null) ??
    null;
  const frameEnd =
    campaign.end_date ??
    (derivedDates.length > 0
      ? [...derivedDates].sort((left, right) => left.localeCompare(right)).at(-1) ?? null
      : null);

  const frameSource: CampaignTimelineView["frameSource"] =
    campaign.start_date && campaign.end_date
      ? "campaign"
      : frameStart && frameEnd
        ? "derived"
        : "none";

  const frameStartMs = frameStart ? toTimestamp(frameStart) : null;
  const frameEndMs = frameEnd ? toTimestamp(frameEnd) : null;

  const missions = orderedMissions.map<CampaignTimelineMissionItem>((mission, index) => {
    const scheduleState = getScheduleState(mission.start_date, mission.end_date);
    const previousMission = orderedMissions[index - 1];
    const currentStart = mission.start_date ? toTimestamp(mission.start_date) : null;
    const previousEnd = previousMission?.end_date
      ? toTimestamp(previousMission.end_date)
      : null;
    const gapBeforeDays =
      currentStart !== null &&
      previousEnd !== null &&
      currentStart > previousEnd
        ? Math.round((currentStart - previousEnd) / (1000 * 60 * 60 * 24))
        : null;

    return {
      id: mission.id,
      name: mission.name,
      sequenceOrder: mission.sequence_order,
      scheduleState,
      startDate: mission.start_date,
      endDate: mission.end_date,
      actionCount: mission.actions.length,
      scheduledActionCount: mission.actions.filter(
        (action) => getScheduleState(action.start_window, action.end_window) === "scheduled",
      ).length,
      gapBeforeDays,
      bar: computeTimelineBar(
        mission.start_date,
        mission.end_date,
        frameStartMs,
        frameEndMs,
      ),
      actions: [...mission.actions]
        .sort((left, right) => {
          const leftStart = left.start_window ?? "";
          const rightStart = right.start_window ?? "";

          if (leftStart && rightStart) {
            return leftStart.localeCompare(rightStart);
          }

          if (leftStart) {
            return -1;
          }

          if (rightStart) {
            return 1;
          }

          return left.title.localeCompare(right.title);
        })
        .map((action) => ({
          id: action.id,
          title: action.title,
          scheduleState: getScheduleState(action.start_window, action.end_window),
          startWindow: action.start_window,
          endWindow: action.end_window,
          bar: computeTimelineBar(
            action.start_window,
            action.end_window,
            frameStartMs,
            frameEndMs,
          ),
        })),
    };
  });

  return {
    frameStart,
    frameEnd,
    frameSource,
    missions,
  };
}
