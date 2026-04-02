import type { AuthenticatedUser } from "./authenticated-user.interface";

export interface RequestWithOrganizationContext {
  headers: Record<string, string | string[] | undefined>;
  currentOrganizationId?: string;
  user?: AuthenticatedUser;
}
