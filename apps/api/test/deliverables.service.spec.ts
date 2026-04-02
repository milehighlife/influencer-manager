import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, jest } from "@jest/globals";

import { DeliverablesService } from "../src/modules/deliverables/deliverables.service";

describe("DeliverablesService", () => {
  it("blocks submitters from approving their own deliverable", async () => {
    const prisma = {
      deliverable: {
        findFirst: jest
          .fn<() => Promise<unknown>>()
          .mockResolvedValue({
            id: "deliverable-1",
            organization_id: "org-1",
            action_assignment_id: "assignment-1",
            status: "submitted",
            submitted_by_user_id: "user-1",
            action_assignment: {
              id: "assignment-1",
              action_id: "action-1",
              assignment_status: "submitted",
              deliverable_count_expected: 1,
            },
          }),
      },
    };
    const auditLogService = {
      logUserEvent: jest.fn<() => Promise<void>>().mockResolvedValue(),
    };

    const service = new DeliverablesService(
      prisma as never,
      auditLogService as never,
    );

    await expect(
      service.approve("org-1", "deliverable-1", {
        id: "user-1",
        email: "manager@example.com",
        fullName: "Manager",
        organizationId: "org-1",
        role: "campaign_manager",
        status: "active",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
