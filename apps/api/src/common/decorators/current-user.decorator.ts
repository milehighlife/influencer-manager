import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import type { RequestWithOrganizationContext } from "../utils/request-with-organization-context.interface";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<RequestWithOrganizationContext>();
    return request.user;
  },
);
