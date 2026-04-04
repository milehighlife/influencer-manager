import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../database/prisma.service";
import type { MessagingAutomationJobData } from "../interfaces/messaging-automation-job.interface";

@Injectable()
export class MessagingAutomationProcessor {
  private readonly logger = new Logger(MessagingAutomationProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  async process(data: MessagingAutomationJobData) {
    if (data.type === "submission_reminder") {
      return this.processSubmissionReminders();
    }

    if (data.type === "overdue_followup") {
      return this.processOverdueFollowups();
    }

    return { processed: 0 };
  }

  private async processSubmissionReminders() {
    const cutoff = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const now = new Date();

    const assignments = await this.prisma.actionAssignment.findMany({
      where: {
        assignment_status: "in_progress",
        action: {
          end_window: { lte: cutoff, gte: now },
        },
        NOT: {
          id: {
            in: (
              await this.prisma.automatedMessageLog.findMany({
                where: { template_type: "submission_reminder" },
                select: { assignment_id: true },
              })
            ).map((l) => l.assignment_id),
          },
        },
      },
      include: {
        influencer: true,
        action: {
          include: {
            mission: {
              include: { campaign: true },
            },
          },
        },
      },
    });

    let sent = 0;

    for (const assignment of assignments) {
      try {
        const template = await this.prisma.messageTemplate.findFirst({
          where: {
            organization_id: assignment.organization_id,
            category: "reminder",
            is_default: true,
          },
        });

        if (!template) continue;

        const firstName =
          assignment.influencer.name.split(" ")[0] ??
          assignment.influencer.name;
        const dueDate = assignment.action.end_window
          ? assignment.action.end_window.toISOString().slice(0, 10)
          : "TBD";

        const body = template.body
          .replace(/\{\{influencer_first_name\}\}/g, firstName)
          .replace(/\{\{influencer_name\}\}/g, assignment.influencer.name)
          .replace(/\{\{action_title\}\}/g, assignment.action.title)
          .replace(
            /\{\{campaign_name\}\}/g,
            assignment.action.mission.campaign.name,
          )
          .replace(/\{\{due_date\}\}/g, dueDate);

        const subject = template.subject
          .replace(/\{\{action_title\}\}/g, assignment.action.title)
          .replace(/\{\{due_date\}\}/g, dueDate);

        const conversation = await this.prisma.conversation.create({
          data: {
            organization_id: assignment.organization_id,
            subject,
            related_entity_type: "assignment",
            related_entity_id: assignment.id,
            participants: {
              create: [{ influencer_id: assignment.influencer_id }],
            },
            messages: {
              create: {
                sender_type: "system",
                body,
                template_id: template.id,
              },
            },
          },
        });

        await this.prisma.notification.create({
          data: {
            organization_id: assignment.organization_id,
            recipient_id: assignment.influencer_id,
            recipient_type: "influencer",
            type: "reminder",
            title: subject,
            body: body.slice(0, 200),
            related_entity_type: "conversation",
            related_entity_id: conversation.id,
          },
        });

        await this.prisma.automatedMessageLog.create({
          data: {
            organization_id: assignment.organization_id,
            assignment_id: assignment.id,
            template_type: "submission_reminder",
          },
        });

        sent++;
      } catch (err) {
        this.logger.error(
          `Reminder failed for assignment ${assignment.id}: ${err instanceof Error ? err.message : "Unknown"}`,
        );
      }
    }

    this.logger.log(`Submission reminders sent: ${sent}`);
    return { processed: sent };
  }

  private async processOverdueFollowups() {
    const now = new Date();
    const overdue24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const overdue72h = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    const terminalStatuses = [
      "completed",
      "completed_by_cascade",
    ] as const;

    const assignments = await this.prisma.actionAssignment.findMany({
      where: {
        assignment_status: { notIn: [...terminalStatuses] },
        due_date: { lt: now },
      },
      include: {
        influencer: true,
        action: {
          include: {
            mission: {
              include: { campaign: true },
            },
          },
        },
      },
    });

    let sent = 0;

    for (const assignment of assignments) {
      const dueDate = assignment.due_date;
      if (!dueDate) continue;

      const hoursOverdue =
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60);

      let templateType: string | null = null;
      if (hoursOverdue >= 72) {
        templateType = "overdue_followup_72h";
      } else if (hoursOverdue >= 24) {
        templateType = "overdue_followup_24h";
      }

      if (!templateType) continue;

      const alreadySent = await this.prisma.automatedMessageLog.findUnique({
        where: {
          assignment_id_template_type: {
            assignment_id: assignment.id,
            template_type: templateType,
          },
        },
      });

      if (alreadySent) continue;

      try {
        const template = await this.prisma.messageTemplate.findFirst({
          where: {
            organization_id: assignment.organization_id,
            category: "follow_up",
            is_default: true,
          },
        });

        if (!template) continue;

        const firstName =
          assignment.influencer.name.split(" ")[0] ??
          assignment.influencer.name;
        const dueDateStr = dueDate.toISOString().slice(0, 10);

        const body = template.body
          .replace(/\{\{influencer_first_name\}\}/g, firstName)
          .replace(/\{\{influencer_name\}\}/g, assignment.influencer.name)
          .replace(/\{\{action_title\}\}/g, assignment.action.title)
          .replace(
            /\{\{campaign_name\}\}/g,
            assignment.action.mission.campaign.name,
          )
          .replace(/\{\{due_date\}\}/g, dueDateStr);

        const subject = template.subject
          .replace(/\{\{action_title\}\}/g, assignment.action.title)
          .replace(/\{\{due_date\}\}/g, dueDateStr);

        const conversation = await this.prisma.conversation.create({
          data: {
            organization_id: assignment.organization_id,
            subject,
            related_entity_type: "assignment",
            related_entity_id: assignment.id,
            participants: {
              create: [{ influencer_id: assignment.influencer_id }],
            },
            messages: {
              create: {
                sender_type: "system",
                body,
                template_id: template.id,
              },
            },
          },
        });

        await this.prisma.notification.create({
          data: {
            organization_id: assignment.organization_id,
            recipient_id: assignment.influencer_id,
            recipient_type: "influencer",
            type: "reminder",
            title: subject,
            body: body.slice(0, 200),
            related_entity_type: "conversation",
            related_entity_id: conversation.id,
          },
        });

        await this.prisma.automatedMessageLog.create({
          data: {
            organization_id: assignment.organization_id,
            assignment_id: assignment.id,
            template_type: templateType,
          },
        });

        sent++;
      } catch (err) {
        this.logger.error(
          `Follow-up failed for assignment ${assignment.id}: ${err instanceof Error ? err.message : "Unknown"}`,
        );
      }
    }

    this.logger.log(`Overdue follow-ups sent: ${sent}`);
    return { processed: sent };
  }
}
