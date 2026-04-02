import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../database/prisma.service";

interface AuditLogInput {
  organizationId: string;
  entityType: string;
  entityId: string;
  eventType: string;
  changedById?: string;
  parentEntityType?: string;
  parentEntityId?: string;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string;
  metadataJson?: unknown;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async logUserEvent(
    input: AuditLogInput,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    await tx.auditLog.create({
      data: {
        organization_id: input.organizationId,
        entity_type: input.entityType,
        entity_id: input.entityId,
        parent_entity_type: input.parentEntityType,
        parent_entity_id: input.parentEntityId,
        event_type: input.eventType,
        previous_value: this.toJsonValue(input.previousValue),
        new_value: this.toJsonValue(input.newValue),
        changed_by_type: "user",
        changed_by_id: input.changedById,
        reason: input.reason,
        metadata_json: this.toJsonValue(input.metadataJson),
      },
    });
  }

  private toJsonValue(value: unknown) {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }
}
