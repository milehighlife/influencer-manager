export interface BulkOutreachJobData {
  organizationId: string;
  templateId: string;
  customSubject?: string;
  customBody?: string;
  influencerIds: string[];
  senderId: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  sendEmail: boolean;
  batchId?: string;
}
