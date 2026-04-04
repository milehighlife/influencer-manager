export interface BulkOutreachJobData {
  organizationId: string;
  templateId: string;
  influencerIds: string[];
  senderId: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  sendEmail: boolean;
}
