import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import type { RequestWithOrganizationContext } from "../utils/request-with-organization-context.interface";

export const CurrentOrganization = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<RequestWithOrganizationContext>();

    if (!request.user) {
      return undefined;
    }

    return {
      id: request.user.organizationId,
      role: request.user.role,
    };
  },
);
