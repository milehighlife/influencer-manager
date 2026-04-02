import { BadRequestException } from "@nestjs/common";

const lifecycleTransitions = {
  campaign: {
    draft: ["planned"],
    planned: ["active", "archived"],
    active: ["paused", "completed"],
    paused: ["active"],
    completed: ["archived"],
    archived: [],
  },
  mission: {
    planned: ["active"],
    active: ["completed"],
    completed: [],
  },
  action: {
    draft: ["scheduled"],
    scheduled: ["active"],
    active: ["awaiting_submission", "completed"],
    awaiting_submission: ["under_review"],
    under_review: ["active", "completed"],
    completed: [],
  },
  action_assignment: {
    assigned: ["accepted"],
    accepted: ["in_progress"],
    in_progress: ["submitted"],
    submitted: ["approved", "rejected"],
    rejected: ["in_progress"],
    approved: ["completed"],
    completed: [],
  },
  deliverable: {
    pending: ["submitted"],
    submitted: ["approved", "rejected"],
    rejected: ["submitted"],
    approved: [],
  },
} as const;

type LifecycleEntity = keyof typeof lifecycleTransitions;

export function assertValidStateTransition(
  entity: LifecycleEntity,
  currentState: string,
  nextState: string,
) {
  if (currentState === nextState) {
    return;
  }

  const allowedTransitions = (
    lifecycleTransitions[entity][
      currentState as keyof (typeof lifecycleTransitions)[LifecycleEntity]
    ] ?? []
  ) as readonly string[];

  if (!allowedTransitions.includes(nextState)) {
    throw new BadRequestException(
      `Invalid ${entity} state transition: ${currentState} -> ${nextState}.`,
    );
  }
}
