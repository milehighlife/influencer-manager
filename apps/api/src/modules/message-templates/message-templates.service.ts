import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { MessageTemplateCategory, Prisma } from "@prisma/client";

import {
  buildPaginatedResponse,
  getPagination,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";
import { CreateMessageTemplateDto } from "./dto/create-message-template.dto";
import { QueryMessageTemplatesDto } from "./dto/query-message-templates.dto";
import { UpdateMessageTemplateDto } from "./dto/update-message-template.dto";

interface DefaultTemplate {
  name: string;
  subject: string;
  body: string;
  category: MessageTemplateCategory;
}

const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    name: "Initial Outreach",
    subject: "Collaboration Opportunity with {{company_name}}",
    body: "Hi {{influencer_name}},\n\nWe're reaching out from {{company_name}} because we believe your content and audience would be a great fit for an upcoming collaboration.\n\nWe'd love to discuss the details with you. Please let us know if you're interested!\n\nBest regards,\n{{sender_name}}",
    category: "outreach",
  },
  {
    name: "Assignment Notification",
    subject: "New Assignment: {{action_title}}",
    body: "Hi {{influencer_name}},\n\nYou have been assigned a new action: {{action_title}}.\n\nPlease review the details and deliverables at your earliest convenience. If you have any questions, don't hesitate to reach out.\n\nThank you,\n{{sender_name}}",
    category: "assignment_notification",
  },
  {
    name: "Submission Reminder",
    subject: "Reminder: {{action_title}} due {{due_date}}",
    body: "Hi {{influencer_name}},\n\nThis is a friendly reminder that your deliverable for {{action_title}} is due on {{due_date}}.\n\nPlease make sure to submit your work before the deadline. Let us know if you need any assistance.\n\nThank you,\n{{sender_name}}",
    category: "reminder",
  },
  {
    name: "Follow-Up",
    subject: "Following up: {{action_title}}",
    body: "Hi {{influencer_name}},\n\nWe noticed that the deliverable for {{action_title}} is now overdue. We understand things can get busy, but we'd appreciate an update on the status.\n\nPlease let us know if there are any issues we can help with.\n\nBest regards,\n{{sender_name}}",
    category: "follow_up",
  },
  {
    name: "Campaign Completion",
    subject: "Campaign Complete: {{campaign_name}}",
    body: "Hi {{influencer_name}},\n\nWe're happy to let you know that the {{campaign_name}} campaign has been completed. Thank you for your excellent participation and contributions!\n\nWe look forward to working with you again in the future.\n\nBest regards,\n{{sender_name}}",
    category: "completion",
  },
];

@Injectable()
export class MessageTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    userId: string,
    dto: CreateMessageTemplateDto,
  ) {
    return this.prisma.messageTemplate.create({
      data: {
        organization_id: organizationId,
        created_by_id: userId,
        ...dto,
      },
    });
  }

  async findAll(organizationId: string, query: QueryMessageTemplatesDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.MessageTemplateWhereInput = {
      organization_id: organizationId,
    };

    if (query.category) {
      where.category = query.category;
    }

    if (query.search?.trim()) {
      where.OR = [
        { name: { contains: query.search.trim(), mode: "insensitive" } },
        { subject: { contains: query.search.trim(), mode: "insensitive" } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.messageTemplate.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
      }),
      this.prisma.messageTemplate.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const template = await this.prisma.messageTemplate.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!template) {
      throw new NotFoundException("Message template not found.");
    }

    return template;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateMessageTemplateDto,
  ) {
    await this.findOne(organizationId, id);

    return this.prisma.messageTemplate.update({
      where: { id },
      data: dto,
    });
  }

  async remove(organizationId: string, id: string) {
    const template = await this.findOne(organizationId, id);

    if (template.is_default) {
      throw new BadRequestException(
        "Default templates cannot be deleted.",
      );
    }

    await this.prisma.messageTemplate.delete({ where: { id } });

    return { id };
  }

  async clone(organizationId: string, id: string, userId: string) {
    const template = await this.findOne(organizationId, id);

    return this.prisma.messageTemplate.create({
      data: {
        organization_id: organizationId,
        created_by_id: userId,
        name: `${template.name} (Copy)`,
        subject: template.subject,
        body: template.body,
        category: template.category,
        is_default: false,
      },
    });
  }

  async seedDefaults(organizationId: string) {
    const existing = await this.prisma.messageTemplate.findFirst({
      where: { organization_id: organizationId, is_default: true },
    });

    if (existing) {
      return;
    }

    await this.prisma.messageTemplate.createMany({
      data: DEFAULT_TEMPLATES.map((t) => ({
        organization_id: organizationId,
        name: t.name,
        subject: t.subject,
        body: t.body,
        category: t.category,
        is_default: true,
      })),
    });
  }
}
