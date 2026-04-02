import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { RequestWithOrganizationContext } from "../utils/request-with-organization-context.interface";

@Injectable()
export class OrganizationContextGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithOrganizationContext>();

    if (!request.user?.organizationId) {
      throw new UnauthorizedException("Organization context is missing.");
    }

    request.currentOrganizationId = request.user?.organizationId;

    return true;
  }
}
