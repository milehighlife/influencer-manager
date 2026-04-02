import type { UserRole } from "@prisma/client";

export interface JwtPayload {
  sub: string;
  organizationId: string;
  influencerId?: string | null;
  role: UserRole;
  email: string;
}
