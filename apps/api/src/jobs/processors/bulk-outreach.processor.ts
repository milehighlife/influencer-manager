import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../database/prisma.service";
import type { BulkOutreachJobData } from "../interfaces/bulk-outreach-job.interface";

@Injectable()
export class BulkOutreachProcessor {
  private readonly logger = new Logger(BulkOutreachProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  async process(data: BulkOutreachJobData) {
    const template = await this.prisma.messageTemplate.findFirst({
      where: {
        id: data.templateId,
        organization_id: data.organizationId,
      },
    });

    if (!template) {
      this.logger.error(`Template ${data.templateId} not found.`);
      return { sent: 0, failed: 0 };
    }

    const influencers = await this.prisma.influencer.findMany({
      where: {
        id: { in: data.influencerIds },
        organization_id: data.organizationId,
      },
    });

    let sent = 0;
    let failed = 0;

    for (const influencer of influencers) {
      try {
        const firstName = influencer.name.split(" ")[0] ?? influencer.name;
        const body = template.body
          .replace(/\{\{influencer_first_name\}\}/g, firstName)
          .replace(/\{\{influencer_name\}\}/g, influencer.name);

        const subject = template.subject
          .replace(/\{\{influencer_first_name\}\}/g, firstName)
          .replace(/\{\{influencer_name\}\}/g, influencer.name);

        const conversation = await this.prisma.conversation.create({
          data: {
            organization_id: data.organizationId,
            subject,
            related_entity_type: data.relatedEntityType as never,
            related_entity_id: data.relatedEntityId,
            created_by_id: data.senderId,
            participants: {
              create: [
                { user_id: data.senderId },
                { influencer_id: influencer.id },
              ],
            },
            messages: {
              create: {
                sender_id: data.senderId,
                sender_type: "user",
                body,
                template_id: template.id,
                sent_via_email: data.sendEmail,
              },
            },
          },
        });

        await this.prisma.notification.create({
          data: {
            organization_id: data.organizationId,
            recipient_id: influencer.id,
            recipient_type: "influencer",
            type: "new_message",
            title: subject,
            body: body.slice(0, 200),
            related_entity_type: "conversation",
            related_entity_id: conversation.id,
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
        entity_id: data.templateId,
        event_type: "bulk_send",
        changed_by_type: "user",
        changed_by_id: data.senderId,
        metadata_json: {
          template_id: data.templateId,
          template_name: template.name,
          total_recipients: data.influencerIds.length,
          sent,
          failed,
        },
      },
    });

    this.logger.log(`Bulk outreach complete: ${sent} sent, ${failed} failed.`);
    return { sent, failed };
  }
}
