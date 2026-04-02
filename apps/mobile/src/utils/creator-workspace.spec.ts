import { describe, expect, it } from "@jest/globals";

import {
  formatCreatorAssignmentStatus,
  formatCreatorDeliverableStatus,
  getCreatorAssignmentActionPrompt,
  getCreatorReviewSignal,
  getLatestSubmittedDeliverable,
  getRevisionGuidanceSteps,
} from "./creator-workspace";

describe("creator workspace helpers", () => {
  it("formats creator-facing assignment statuses without changing workflow states", () => {
    expect(formatCreatorAssignmentStatus("submitted")).toBe("Awaiting Review");
    expect(formatCreatorAssignmentStatus("rejected")).toBe(
      "Changes Requested",
    );
    expect(formatCreatorAssignmentStatus("in_progress")).toBe("In Progress");
  });

  it("formats creator-facing deliverable review statuses", () => {
    expect(formatCreatorDeliverableStatus("submitted")).toBe("In Review");
    expect(formatCreatorDeliverableStatus("rejected")).toBe(
      "Changes Requested",
    );
  });

  it("returns creator-friendly next-step prompts", () => {
    expect(getCreatorAssignmentActionPrompt("approved")).toBe(
      "Link the published post next",
    );
    expect(getCreatorAssignmentActionPrompt("completed")).toBe(
      "No further action needed",
    );
  });

  it("surfaces the latest rejection reason in the creator review signal", () => {
    const signal = getCreatorReviewSignal(
      "rejected",
      [
        {
          id: "deliverable-1",
          organization_id: "org-1",
          action_assignment_id: "assignment-1",
          deliverable_type: "final_asset",
          description: null,
          status: "rejected",
          submission_url: null,
          rejection_reason: "Please tighten the hook in the first three seconds.",
          submitted_at: null,
          approved_at: null,
          created_at: "2026-03-13T10:00:00.000Z",
          updated_at: "2026-03-13T11:00:00.000Z",
          posts: [],
        },
      ],
      0,
    );

    expect(signal).toMatchObject({
      title: "Changes requested",
      message: "Please tighten the hook in the first three seconds.",
    });
  });

  it("returns creator-facing revision guidance steps for rejected work", () => {
    expect(getRevisionGuidanceSteps("rejected")).toEqual([
      "Review the requested changes below.",
      "Resume the assignment to reopen edits.",
      "Update the deliverable and submit it again for review.",
    ]);
  });

  it("finds the most recent submitted deliverable for revision history", () => {
    const latest = getLatestSubmittedDeliverable([
      {
        id: "deliverable-1",
        organization_id: "org-1",
        action_assignment_id: "assignment-1",
        deliverable_type: "final_asset",
        description: null,
        status: "submitted",
        submission_url: null,
        rejection_reason: null,
        submitted_at: "2026-03-13T10:00:00.000Z",
        approved_at: null,
        created_at: "2026-03-13T09:00:00.000Z",
        updated_at: "2026-03-13T10:00:00.000Z",
        posts: [],
      },
      {
        id: "deliverable-2",
        organization_id: "org-1",
        action_assignment_id: "assignment-1",
        deliverable_type: "final_asset",
        description: null,
        status: "rejected",
        submission_url: null,
        rejection_reason: null,
        submitted_at: "2026-03-13T12:00:00.000Z",
        approved_at: null,
        created_at: "2026-03-13T11:00:00.000Z",
        updated_at: "2026-03-13T12:30:00.000Z",
        posts: [],
      },
    ]);

    expect(latest?.id).toBe("deliverable-2");
  });

});
