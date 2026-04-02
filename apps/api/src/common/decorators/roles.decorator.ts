import { SetMetadata } from "@nestjs/common";

import type { OrganizationRole } from "@influencer-manager/shared/types";

export const ROLES_KEY = "roles";
export const Roles = (...roles: OrganizationRole[]) =>
  SetMetadata(ROLES_KEY, roles);
