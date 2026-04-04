import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";

import type { AuthenticatedUser } from "../../../common/utils/authenticated-user.interface";
import { loadRuntimeConfig } from "../../../config/runtime-config";
import { PrismaService } from "../../../database/prisma.service";
import type { JwtPayload } from "../interfaces/jwt-payload.interface";

function extractJwtFromCookieOrHeader(req: Request): string | null {
  const fromCookie = req.cookies?.access_token as string | undefined;
  if (fromCookie) {
    return fromCookie;
  }
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const runtimeConfig = loadRuntimeConfig();

    super({
      jwtFromRequest: extractJwtFromCookieOrHeader,
      ignoreExpiration: false,
      secretOrKey: runtimeConfig.jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        organization_id: payload.organizationId,
        status: "active",
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid authentication token.");
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      organizationId: user.organization_id,
      influencerId: user.influencer_id,
      role: user.role,
      status: user.status,
    };
  }
}
