import type {
  AssignmentStatus,
  DeliverableStatus,
  InfluencerWorkspaceDeliverable,
} from "@influencer-manager/shared/types/mobile";

import { formatStatus } from "./format";

export function formatCreatorAssignmentStatus(status: AssignmentStatus) {
  switch (status) {
    case "submitted":
      return "Awaiting Review";
    case "rejected":
      return "Changes Requested";
    case "approved":
      return "Approved";
    default:
      return formatStatus(status);
  }
}

export function formatCreatorDeliverableStatus(status: DeliverableStatus) {
  switch (status) {
    case "submitted":
      return "In Review";
    case "rejected":
      return "Changes Requested";
    default:
      return formatStatus(status);
  }
}

export function getCreatorAssignmentActionPrompt(status: AssignmentStatus) {
  switch (status) {
    case "assigned":
      return "Needs your confirmation";
    case "accepted":
      return "Ready to move into production";
    case "in_progress":
      return "Prepare your deliverable for review";
    case "submitted":
      return "Waiting on reviewer feedback";
    case "approved":
      return "Link the published post next";
    case "rejected":
      return "Review notes and resubmit";
    case "completed":
      return "No further action needed";
    default:
      return "Check the latest assignment update";
  }
}

export function getLatestRejectedDeliverable(
  deliverables: InfluencerWorkspaceDeliverable[],
) {
  return [...deliverables]
    .filter((deliverable) => deliverable.status === "rejected")
    .sort(
      (left, right) =>
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
    )[0];
}

export function getLatestSubmittedDeliverable(
  deliverables: InfluencerWorkspaceDeliverable[],
) {
  return [...deliverables]
    .filter((deliverable) => Boolean(deliverable.submitted_at))
    .sort(
      (left, right) =>
        new Date(right.submitted_at ?? 0).getTime() -
        new Date(left.submitted_at ?? 0).getTime(),
    )[0];
}

export function getRevisionGuidanceSteps(status: AssignmentStatus) {
  switch (status) {
    case "rejected":
      return [
        "Review the requested changes below.",
        "Resume the assignment to reopen edits.",
        "Update the deliverable and submit it again for review.",
      ];
    case "submitted":
      return [
        "Wait for the reviewer to approve the work or request changes.",
      ];
    default:
      return [];
  }
}

export function getCreatorReviewSignal(
  status: AssignmentStatus,
  deliverables: InfluencerWorkspaceDeliverable[],
  linkedPostCount: number,
) {
  const latestRejectedDeliverable = getLatestRejectedDeliverable(deliverables);
  const approvedDeliverableCount = deliverables.filter(
    (deliverable) => deliverable.status === "approved",
  ).length;

  switch (status) {
    case "submitted":
      return {
        eyebrow: "Review status",
        title: "Awaiting feedback",
        message:
          "Your submission is with the reviewer. You do not need to take action until they approve it or request changes.",
      };
    case "approved":
      return {
        eyebrow: "Review result",
        title: "Approved and ready to post",
        message:
          approvedDeliverableCount > 1
            ? `${approvedDeliverableCount} deliverables are approved. Link each published post as it goes live.`
            : "Your approved deliverable is ready for published post linkage and metric tracking.",
      };
    case "rejected":
      return {
        eyebrow: "Review result",
        title: "Changes requested",
        message:
          latestRejectedDeliverable?.rejection_reason ??
          "A reviewer requested revisions before this work can be approved.",
      };
    case "completed":
      return {
        eyebrow: "Review result",
        title: "Assignment complete",
        message:
          linkedPostCount > 0
            ? `${linkedPostCount} published post${linkedPostCount === 1 ? "" : "s"} linked. Performance tracking stays available below.`
            : "The assignment is complete and no more creator action is required.",
      };
    default:
      return null;
  }
}
