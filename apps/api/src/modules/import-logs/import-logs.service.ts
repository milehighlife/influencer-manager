import { Injectable } from "@nestjs/common";
import {
  ImportLogStatus,
  Prisma,
  SocialPlatform,
} from "@prisma/client";

import { PrismaService } from "../../database/prisma.service";

interface CreateImportLogInput {
  organizationId: string;
  postId: string;
  platform: SocialPlatform;
  status?: ImportLogStatus;
  rawMetadataJson?: unknown;
}

@Injectable()
export class ImportLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateImportLogInput) {
    return this.prisma.importLog.create({
      data: {
        organization_id: input.organizationId,
        post_id: input.postId,
        platform: input.platform,
        status: input.status ?? ImportLogStatus.queued,
        raw_metadata_json: this.toJsonValue(input.rawMetadataJson),
      },
    });
  }

  async markRunning(importLogId: string, rawMetadataJson?: unknown) {
    return this.prisma.importLog.update({
      where: { id: importLogId },
      data: {
        status: ImportLogStatus.running,
        raw_metadata_json: this.toJsonValue(rawMetadataJson),
      },
    });
  }

  async markCompleted(importLogId: string, rawMetadataJson?: unknown) {
    return this.prisma.importLog.update({
      where: { id: importLogId },
      data: {
        status: ImportLogStatus.completed,
        completed_at: new Date(),
        error_message: null,
        raw_metadata_json: this.toJsonValue(rawMetadataJson),
      },
    });
  }

  async markFailed(
    importLogId: string,
    errorMessage: string,
    rawMetadataJson?: unknown,
  ) {
    return this.prisma.importLog.update({
      where: { id: importLogId },
      data: {
        status: ImportLogStatus.failed,
        completed_at: new Date(),
        error_message: errorMessage,
        raw_metadata_json: this.toJsonValue(rawMetadataJson),
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
