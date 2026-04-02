import { Injectable, NestMiddleware } from "@nestjs/common";

import type { RequestWithOrganizationContext } from "../utils/request-with-organization-context.interface";

@Injectable()
export class OrganizationContextMiddleware implements NestMiddleware {
  use(
    request: RequestWithOrganizationContext,
    _response: unknown,
    next: () => void,
  ) {
    if (!request.currentOrganizationId && request.user?.organizationId) {
      request.currentOrganizationId = request.user.organizationId;
    }

    next();
  }
}
