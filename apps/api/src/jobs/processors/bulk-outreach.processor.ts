import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { PrismaService } from "../../database/prisma.service";
import type { BulkOutreachJobData } from "../interfaces/bulk-outreach-job.interface";

@Injectable()
export class BulkOutreachProcessor {
  private readonly logger = new Logger(BulkOutreachProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  async process(data: BulkOutreachJobData) {
    let template: { id: string; name: string; subject: string; body: string } | null = null;

    if (data.templateId) {
      template = await this.prisma.messageTemplate.findFirst({
        where: {
          id: data.templateId,
          organization_id: data.organizationId,
        },
      });
    }

    const templateSubject = template?.subject ?? data.customSubject ?? "Message";
    const templateBody = template?.body ?? data.customBody ?? "";

    if (!templateBody) {
      this.logger.error("No template or custom body provided.");
      return { sent: 0, failed: 0 };
    }

    const influencers = await this.prisma.influencer.findMany({
      where: {
        id: { in: data.influencerIds },
        organization_id: data.organizationId,
      },
    });

    const batchId = data.batchId ?? randomUUID();
    const templateName = template?.name ?? "Custom message";
    let sent = 0;
    let failed = 0;

    for (const influencer of influencers) {
      try {
        const now = new Date();
        const firstName = influencer.name.split(" ")[0] ?? influencer.name;
        const body = templateBody
          .replace(/\{\{influencer_first_name\}\}/g, firstName)
          .replace(/\{\{influencer_name\}\}/g, influencer.name);

        const subject = templateSubject
          .replace(/\{\{influencer_first_name\}\}/g, firstName)
          .replace(/\{\{influencer_name\}\}/g, influencer.name);

        await this.prisma.conversation.create({
          data: {
            organization_id: data.organizationId,
            subject,
            related_entity_type: data.relatedEntityType as never,
            related_entity_id: data.relatedEntityId,
            outreach_batch_id: batchId,
            outreach_template_name: templateName,
            created_by_id: data.senderId,
            participants: {
              create: [
                {
                  user_id: data.senderId,
                  last_read_at: now,
                },
                { influencer_id: influencer.id },
              ],
            },
            messages: {
              create: {
                sender_id: data.senderId,
                sender_type: "user",
                body,
                template_id: template?.id ?? undefined,
                sent_via_email: data.sendEmail,
              },
            },
          },
        });

        sent++;
      } catch (err) {
        this.logger.error(
          `Failed to send to influencer ${influencer.id}: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
        failed++;
      }
    }

    await this.prisma.auditLog.create({
      data: {
        organization_id: data.organizationId,
        entity_type: "bulk_outreach",
        entity_id: batchId,
        event_type: "bulk_send",
        changed_by_type: "user",
        changed_by_id: data.senderId,
        metadata_json: {
          batch_id: batchId,
          template_id: data.templateId || null,
          template_name: templateName,
          total_recipients: data.influencerIds.length,
          sent,
          failed,
        },
      },
    });

    this.logger.log(`Bulk outreach ${batchId}: ${sent} sent, ${failed} failed.`);
    return { sent, failed };
  }
}
