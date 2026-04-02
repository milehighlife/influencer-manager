import type { PlanningViewAction } from "@influencer-manager/shared/types/mobile";
import { describe, expect, it } from "vitest";

import {
  buildCampaignTimeline,
  buildMissionSequenceUpdates,
  filterMissionActions,
  filterInfluencers,
  getActionStatusOptions,
  getCampaignStatusOptions,
  getTimelineScheduleLabel,
  toNullableScheduleValue,
  validateCampaignSchedule,
  validateActionWindow,
  validateMissionSchedule,
} from "./campaign-builder";

describe("campaign builder helpers", () => {
  it("filters influencers by creator-visible identity fields", () => {
    const results = filterInfluencers(
      [
        {
          id: "influencer-1",
          name: "Nina Alvarez",
          handle: "@nina",
          primary_platform: "instagram",
          email: "nina@example.com",
          location: "Los Angeles",
          audience_description: null,
          niche_tags: [],
          status: "active",
          created_at: "2026-03-01T00:00:00.000Z",
          updated_at: "2026-03-01T00:00:00.000Z",
        },
      ],
      "los angeles",
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("Nina Alvarez");
  });

  it("limits campaign edit statuses to the current and legal next states", () => {
    expect(getCampaignStatusOptions("active")).toEqual(["active", "paused", "completed"]);
    expect(getCampaignStatusOptions("completed")).toEqual(["completed", "archived"]);
  });

  it("limits action edit statuses to the current and legal next states", () => {
    expect(getActionStatusOptions("draft")).toEqual(["draft", "scheduled"]);
    expect(getActionStatusOptions("under_review")).toEqual([
      "under_review",
      "active",
      "completed",
    ]);
  });

  it("builds normalized mission sequence updates when a mission moves", () => {
    expect(
      buildMissionSequenceUpdates(
        [
          {
            id: "mission-1",
            campaign_id: "campaign-1",
            name: "First wave",
            description: null,
            sequence_order: 1,
            start_date: null,
            end_date: null,
            status: "planned",
            created_at: "2026-03-01T00:00:00.000Z",
            updated_at: "2026-03-01T00:00:00.000Z",
            actions: [],
          },
          {
            id: "mission-2",
            campaign_id: "campaign-1",
            name: "Second wave",
            description: null,
            sequence_order: 2,
            start_date: null,
            end_date: null,
            status: "planned",
            created_at: "2026-03-02T00:00:00.000Z",
            updated_at: "2026-03-02T00:00:00.000Z",
            actions: [],
          },
        ],
        "mission-2",
        "up",
      ),
    ).toEqual([
      { id: "mission-2", sequence_order: 1 },
      { id: "mission-1", sequence_order: 2 },
    ]);
  });

  it("filters mission actions by planner filter state without changing mission order", () => {
    const results = filterMissionActions(
      [
        {
          id: "mission-1",
          campaign_id: "campaign-1",
          name: "Launch wave",
          description: null,
          sequence_order: 1,
          start_date: null,
          end_date: null,
          status: "active",
          created_at: "2026-03-01T00:00:00.000Z",
          updated_at: "2026-03-01T00:00:00.000Z",
          actions: [
            {
              id: "action-1",
              mission_id: "mission-1",
              platform: "instagram",
              title: "Reel brief",
              instructions: null,
              content_format: "reel",
              required_deliverables: 1,
              approval_required: true,
              start_window: null,
              end_window: null,
              status: "active",
              created_at: "2026-03-01T00:00:00.000Z",
              updated_at: "2026-03-01T00:00:00.000Z",
              assignments: [],
            },
            {
              id: "action-2",
              mission_id: "mission-1",
              platform: "tiktok",
              title: "TikTok launch",
              instructions: null,
              content_format: "short_video",
              required_deliverables: 2,
              approval_required: true,
              start_window: null,
              end_window: null,
              status: "scheduled",
              created_at: "2026-03-01T00:00:00.000Z",
              updated_at: "2026-03-01T00:00:00.000Z",
              assignments: [
                {
                  id: "assignment-1",
                  action_id: "action-2",
                  influencer_id: "influencer-1",
                  assignment_status: "assigned",
                  assigned_at: null,
                  due_date: null,
                  completion_date: null,
                  deliverable_count_expected: 1,
                  deliverable_count_submitted: 0,
                  created_at: "2026-03-01T00:00:00.000Z",
                  updated_at: "2026-03-01T00:00:00.000Z",
                  influencer_summary: {
                    id: "influencer-1",
                    name: "Nina",
                    email: "nina@example.com",
                    primary_platform: "tiktok",
                    location: null,
                    status: "active",
                  },
                },
              ],
            },
          ],
        },
      ],
      {
        status: "scheduled",
        platform: "tiktok",
        staffing: "staffed",
      },
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.sequence_order).toBe(1);
    expect(results[0]?.actions).toHaveLength(1);
    expect(results[0]?.actions[0]?.id).toBe("action-2");
  });

  it("validates mission dates stay ordered and inside the campaign window", () => {
    expect(
      validateMissionSchedule({
        startDate: "2026-03-12",
        endDate: "2026-03-10",
      }),
    ).toBe("Mission start date must be on or before the mission end date.");

    expect(
      validateMissionSchedule({
        startDate: "2026-02-28",
        endDate: "2026-03-10",
        campaignStartDate: "2026-03-01T00:00:00.000Z",
        campaignEndDate: "2026-03-31T00:00:00.000Z",
      }),
    ).toBe("Mission start date must stay within the campaign date window.");

    expect(
      validateMissionSchedule({
        startDate: "2026-03-04",
        endDate: "2026-03-10",
        campaignStartDate: "2026-03-01T00:00:00.000Z",
        campaignEndDate: "2026-03-31T00:00:00.000Z",
      }),
    ).toBeNull();
  });

  it("validates campaign dates stay ordered and include scheduled mission windows", () => {
    expect(
      validateCampaignSchedule({
        startDate: "2026-03-12",
        endDate: "2026-03-10",
      }),
    ).toBe("Campaign start date must be on or before the campaign end date.");

    expect(
      validateCampaignSchedule({
        startDate: "2026-03-06",
        missions: [
          {
            id: "mission-1",
            campaign_id: "campaign-1",
            name: "Awareness",
            description: null,
            sequence_order: 1,
            start_date: "2026-03-04T00:00:00.000Z",
            end_date: "2026-03-10T00:00:00.000Z",
            status: "planned",
            created_at: "2026-03-01T00:00:00.000Z",
            updated_at: "2026-03-01T00:00:00.000Z",
            actions: [],
          },
        ],
      }),
    ).toBe(
      'Campaign dates must include mission "Awareness" from 2026-03-04 to 2026-03-10.',
    );

    expect(
      validateCampaignSchedule({
        startDate: "",
        endDate: "",
        missions: [],
      }),
    ).toBeNull();
  });

  it("normalizes cleared schedule fields to explicit nulls", () => {
    expect(toNullableScheduleValue("")).toBeNull();
    expect(toNullableScheduleValue("   ")).toBeNull();
    expect(toNullableScheduleValue("2026-03-10")).toBe("2026-03-10");
  });

  it("allows same-day mission handoff but blocks sibling overlap", () => {
    expect(
      validateMissionSchedule({
        missionId: "mission-2",
        sequenceOrder: 2,
        startDate: "2026-03-10",
        endDate: "2026-03-15",
        siblingMissions: [
          {
            id: "mission-1",
            campaign_id: "campaign-1",
            name: "Awareness",
            description: null,
            sequence_order: 1,
            start_date: "2026-03-01T00:00:00.000Z",
            end_date: "2026-03-10T00:00:00.000Z",
            status: "planned",
            created_at: "2026-03-01T00:00:00.000Z",
            updated_at: "2026-03-01T00:00:00.000Z",
            actions: [],
          },
        ],
      }),
    ).toBeNull();

    expect(
      validateMissionSchedule({
        missionId: "mission-2",
        sequenceOrder: 2,
        startDate: "2026-03-09",
        endDate: "2026-03-15",
        siblingMissions: [
          {
            id: "mission-1",
            campaign_id: "campaign-1",
            name: "Awareness",
            description: null,
            sequence_order: 1,
            start_date: "2026-03-01T00:00:00.000Z",
            end_date: "2026-03-10T00:00:00.000Z",
            status: "planned",
            created_at: "2026-03-01T00:00:00.000Z",
            updated_at: "2026-03-01T00:00:00.000Z",
            actions: [],
          },
        ],
      }),
    ).toBe(
      'Mission dates overlap with "Awareness" from 2026-03-01 to 2026-03-10.',
    );
  });

  it("blocks sequence conflicts when a later mission starts before an earlier mission ends", () => {
    expect(
      validateMissionSchedule({
        missionId: "mission-2",
        sequenceOrder: 2,
        startDate: "2026-03-05",
        endDate: "2026-03-08",
        siblingMissions: [
          {
            id: "mission-1",
            campaign_id: "campaign-1",
            name: "Awareness",
            description: null,
            sequence_order: 1,
            start_date: "2026-03-12T00:00:00.000Z",
            end_date: "2026-03-20T00:00:00.000Z",
            status: "planned",
            created_at: "2026-03-01T00:00:00.000Z",
            updated_at: "2026-03-01T00:00:00.000Z",
            actions: [],
          },
        ],
      }),
    ).toBe(
      'Mission sequence conflicts with "Awareness". Later missions cannot start before earlier missions end.',
    );
  });

  it("validates action windows stay ordered and inside the mission window", () => {
    expect(
      validateActionWindow({
        startWindow: "2026-03-12T12:00",
        endWindow: "2026-03-10T12:00",
      }),
    ).toBe("Action start window must be on or before the action end window.");

    expect(
      validateActionWindow({
        startWindow: "2026-03-09T12:00",
        missionStartDate: "2026-03-10T00:00:00.000Z",
        missionEndDate: "2026-03-18T00:00:00.000Z",
      }),
    ).toBe(
      "Action dates must stay within the parent mission window: 2026-03-10 to 2026-03-18.",
    );

    expect(
      validateActionWindow({
        endWindow: "2026-03-19T12:00",
        missionStartDate: "2026-03-10T00:00:00.000Z",
        missionEndDate: "2026-03-18T00:00:00.000Z",
      }),
    ).toBe(
      "Action dates must stay within the parent mission window: 2026-03-10 to 2026-03-18.",
    );

    expect(
      validateActionWindow({
        endWindow: "2026-03-15T12:00",
        missionStartDate: "2026-03-10T00:00:00.000Z",
        missionEndDate: "2026-03-18T00:00:00.000Z",
      }),
    ).toBeNull();

    expect(
      validateActionWindow({
        startWindow: "2026-03-10T00:00",
        endWindow: "2026-03-18T23:59",
        missionStartDate: "2026-03-10T00:00:00.000Z",
        missionEndDate: "2026-03-18T00:00:00.000Z",
      }),
    ).toBeNull();
  });

  it("blocks overlapping sibling action windows but allows same-day handoff", () => {
    const siblingActions: PlanningViewAction[] = [
      {
        id: "action-1",
        mission_id: "mission-1",
        platform: "instagram",
        title: "Launch reel",
        instructions: null,
        content_format: "reel",
        required_deliverables: 1,
        approval_required: true,
        start_window: "2026-03-10T08:00:00.000Z",
        end_window: "2026-03-10T12:00:00.000Z",
        status: "scheduled",
        created_at: "2026-03-01T00:00:00.000Z",
        updated_at: "2026-03-01T00:00:00.000Z",
        assignments: [],
      },
    ];

    expect(
      validateActionWindow({
        startWindow: "2026-03-10T11:00",
        endWindow: "2026-03-10T13:00",
        siblingActions,
      }),
    ).toBe(
      'Action window overlaps with "Launch reel" from 2026-03-10 08:00 to 2026-03-10 12:00.',
    );

    expect(
      validateActionWindow({
        startWindow: "2026-03-10T12:00",
        endWindow: "2026-03-10T14:00",
        siblingActions,
      }),
    ).toBeNull();
  });

  it("builds timeline data in mission sequence order with nested action schedule state", () => {
    const timeline = buildCampaignTimeline({
      id: "campaign-1",
      company_id: "company-1",
      name: "Glow Launch",
      description: null,
      start_date: "2026-03-01T00:00:00.000Z",
      end_date: "2026-03-20T00:00:00.000Z",
      budget: null,
      status: "planned",
      campaign_type: null,
      created_at: "2026-03-01T00:00:00.000Z",
      updated_at: "2026-03-01T00:00:00.000Z",
      company: {
        id: "company-1",
        client_id: "client-1",
        name: "Glow Labs",
        description: null,
        status: "active",
        created_at: "2026-03-01T00:00:00.000Z",
        updated_at: "2026-03-01T00:00:00.000Z",
      },
      missions: [
        {
          id: "mission-2",
          campaign_id: "campaign-1",
          name: "Demo",
          description: null,
          sequence_order: 2,
          start_date: null,
          end_date: null,
          status: "planned",
          created_at: "2026-03-01T00:00:00.000Z",
          updated_at: "2026-03-01T00:00:00.000Z",
          actions: [
            {
              id: "action-2",
              mission_id: "mission-2",
              platform: "instagram",
              title: "Story frames",
              instructions: null,
              content_format: "story_set",
              required_deliverables: 1,
              approval_required: true,
              start_window: null,
              end_window: null,
              status: "draft",
              created_at: "2026-03-01T00:00:00.000Z",
              updated_at: "2026-03-01T00:00:00.000Z",
              assignments: [],
            },
          ],
        },
        {
          id: "mission-1",
          campaign_id: "campaign-1",
          name: "Launch",
          description: null,
          sequence_order: 1,
          start_date: "2026-03-01T00:00:00.000Z",
          end_date: "2026-03-05T00:00:00.000Z",
          status: "active",
          created_at: "2026-03-01T00:00:00.000Z",
          updated_at: "2026-03-01T00:00:00.000Z",
          actions: [
            {
              id: "action-3",
              mission_id: "mission-1",
              platform: "instagram",
              title: "Teaser",
              instructions: null,
              content_format: "reel",
              required_deliverables: 1,
              approval_required: true,
              start_window: null,
              end_window: "2026-03-04T09:00:00.000Z",
              status: "scheduled",
              created_at: "2026-03-01T00:00:00.000Z",
              updated_at: "2026-03-01T00:00:00.000Z",
              assignments: [],
            },
            {
              id: "action-1",
              mission_id: "mission-1",
              platform: "tiktok",
              title: "Launch video",
              instructions: null,
              content_format: "short_video",
              required_deliverables: 1,
              approval_required: true,
              start_window: "2026-03-02T09:00:00.000Z",
              end_window: "2026-03-03T17:00:00.000Z",
              status: "scheduled",
              created_at: "2026-03-01T00:00:00.000Z",
              updated_at: "2026-03-01T00:00:00.000Z",
              assignments: [],
            },
          ],
        },
      ],
    });

    expect(timeline.frameSource).toBe("campaign");
    expect(timeline.missions.map((mission) => mission.id)).toEqual([
      "mission-1",
      "mission-2",
    ]);
    expect(timeline.missions[0]?.scheduleState).toBe("scheduled");
    expect(timeline.missions[0]?.actions.map((action) => action.id)).toEqual([
      "action-1",
      "action-3",
    ]);
    expect(timeline.missions[0]?.actions[1]?.scheduleState).toBe("partial");
    expect(timeline.missions[1]?.scheduleState).toBe("unscheduled");
  });

  it("derives timeline frame and mission gaps when campaign dates are missing", () => {
    const timeline = buildCampaignTimeline({
      id: "campaign-1",
      company_id: "company-1",
      name: "Glow Launch",
      description: null,
      start_date: null,
      end_date: null,
      budget: null,
      status: "planned",
      campaign_type: null,
      created_at: "2026-03-01T00:00:00.000Z",
      updated_at: "2026-03-01T00:00:00.000Z",
      company: {
        id: "company-1",
        client_id: "client-1",
        name: "Glow Labs",
        description: null,
        status: "active",
        created_at: "2026-03-01T00:00:00.000Z",
        updated_at: "2026-03-01T00:00:00.000Z",
      },
      missions: [
        {
          id: "mission-1",
          campaign_id: "campaign-1",
          name: "Awareness",
          description: null,
          sequence_order: 1,
          start_date: "2026-03-01T00:00:00.000Z",
          end_date: "2026-03-03T00:00:00.000Z",
          status: "planned",
          created_at: "2026-03-01T00:00:00.000Z",
          updated_at: "2026-03-01T00:00:00.000Z",
          actions: [],
        },
        {
          id: "mission-2",
          campaign_id: "campaign-1",
          name: "Demo",
          description: null,
          sequence_order: 2,
          start_date: "2026-03-05T00:00:00.000Z",
          end_date: "2026-03-07T00:00:00.000Z",
          status: "planned",
          created_at: "2026-03-01T00:00:00.000Z",
          updated_at: "2026-03-01T00:00:00.000Z",
          actions: [],
        },
      ],
    });

    expect(timeline.frameSource).toBe("derived");
    expect(timeline.frameStart).toBe("2026-03-01T00:00:00.000Z");
    expect(timeline.frameEnd).toBe("2026-03-07T00:00:00.000Z");
    expect(timeline.missions[1]?.gapBeforeDays).toBe(2);
  });

  it("returns creator-friendly schedule labels for timeline display", () => {
    expect(getTimelineScheduleLabel("scheduled")).toBe("Scheduled");
    expect(getTimelineScheduleLabel("partial")).toBe("Partial schedule");
    expect(getTimelineScheduleLabel("unscheduled")).toBe("Unscheduled");
  });
});
