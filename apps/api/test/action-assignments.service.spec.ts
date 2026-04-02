import { BadRequestException, ConflictException } from "@nestjs/common";
import { describe, expect, it, jest } from "@jest/globals";

import { ActionAssignmentsService } from "../src/modules/action-assignments/action-assignments.service";

describe("ActionAssignmentsService", () => {
  it("blocks duplicate influencer assignments for the same action", async () => {
    const prisma = {
      action: {
        findFirst: jest
          .fn<() => Promise<unknown>>()
          .mockResolvedValue({ id: "action-1" }),
      },
      influencer: {
        findFirst: jest
          .fn<() => Promise<unknown>>()
          .mockResolvedValue({ id: "influencer-1" }),
      },
      actionAssignment: {
        findFirst: jest
          .fn<() => Promise<unknown>>()
          .mockResolvedValue({ id: "existing-assignment" }),
      },
    };
    const auditLogService = {
      logUserEvent: jest.fn<() => Promise<void>>().mockResolvedValue(),
    };

    const service = new ActionAssignmentsService(
      prisma as never,
      auditLogService as never,
    );

    await expect(
      service.create("org-1", {
        action_id: "action-1",
        influencer_id: "influencer-1",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("requires the full expected deliverable package before submission", async () => {
    const tx = {
      deliverable: {
        count: jest.fn<() => Promise<number>>().mockResolvedValue(0),
      },
    };
    const prisma = {
      actionAssignment: {
        findFirst: jest
          .fn<() => Promise<unknown>>()
          .mockResolvedValue({
            id: "assignment-1",
            organization_id: "org-1",
            action_id: "action-1",
            assignment_status: "in_progress",
            deliverable_count_expected: 2,
          }),
      },
      $transaction: jest
        .fn<
          (callback: (transactionClient: typeof tx) => Promise<unknown>) => Promise<unknown>
        >()
        .mockImplementation(async (callback) => callback(tx)),
    };
    const auditLogService = {
      logUserEvent: jest.fn<() => Promise<void>>().mockResolvedValue(),
    };

    const service = new ActionAssignmentsService(
      prisma as never,
      auditLogService as never,
    );

    await expect(
      service.submit(
        "org-1",
        "assignment-1",
        {
          id: "user-1",
          email: "manager@example.com",
          fullName: "Manager",
          organizationId: "org-1",
          role: "campaign_manager",
          status: "active",
        },
        {
          deliverables: [
            {
              deliverable_type: "draft_content",
              description: "One draft only",
            },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("blocks completion until required posts exist on approved deliverables", async () => {
    const prisma = {
      actionAssignment: {
        findFirst: jest
          .fn<() => Promise<unknown>>()
          .mockResolvedValue({
            id: "assignment-1",
            organization_id: "org-1",
            action_id: "action-1",
            assignment_status: "approved",
            deliverable_count_expected: 1,
            deliverables: [
              {
                id: "deliverable-1",
                status: "approved",
                posts: [],
              },
            ],
          }),
      },
    };
    const auditLogService = {
      logUserEvent: jest.fn<() => Promise<void>>().mockResolvedValue(),
    };

    const service = new ActionAssignmentsService(
      prisma as never,
      auditLogService as never,
    );

    await expect(
      service.complete("org-1", "assignment-1", {
        id: "user-1",
        email: "manager@example.com",
        fullName: "Manager",
        organizationId: "org-1",
        role: "campaign_manager",
        status: "active",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
