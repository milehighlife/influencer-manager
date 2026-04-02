import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import type { AuthenticatedUser } from "../../common/utils/authenticated-user.interface";
import { verifyPassword } from "../../common/utils/password.util";
import { PrismaService } from "../../database/prisma.service";
import { LoginDto } from "./dto/login.dto";
import type { JwtPayload } from "./interfaces/jwt-payload.interface";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || user.status !== "active" || !user.password_hash) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const passwordMatches = await verifyPassword(dto.password, user.password_hash);

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const payload: JwtPayload = {
      sub: user.id,
      organizationId: user.organization_id,
      influencerId: user.influencer_id,
      role: user.role,
      email: user.email,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: this.toAuthenticatedUser(user),
    };
  }

  async getMe(userId: string, organizationId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organization_id: organizationId,
        status: "active",
      },
    });

    if (!user) {
      throw new UnauthorizedException("Authenticated user not found.");
    }

    return this.toAuthenticatedUser(user);
  }

  private toAuthenticatedUser(user: {
    id: string;
    email: string;
    full_name: string;
    organization_id: string;
    influencer_id: string | null;
    role: JwtPayload["role"];
    status: "active" | "invited" | "suspended";
  }): AuthenticatedUser {
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
