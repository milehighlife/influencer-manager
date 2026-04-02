import type { UserRole, UserStatus } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  organizationId: string;
  influencerId?: string | null;
  role: UserRole;
  status: UserStatus;
}
