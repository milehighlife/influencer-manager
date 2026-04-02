export const ORGANIZATION_ROLES = [
  "organization_admin",
  "campaign_manager",
  "campaign_editor",
  "analyst",
  "viewer",
  "influencer",
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const ORGANIZATION_ADMIN_ROLES = ["organization_admin"] as const;

export const PLANNING_WRITE_ROLES = [
  "organization_admin",
  "campaign_manager",
] as const;

export const READ_ONLY_ROLES = ["analyst", "viewer"] as const;

export const INFLUENCER_ROLES = ["influencer"] as const;
