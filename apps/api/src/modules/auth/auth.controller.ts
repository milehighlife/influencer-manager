import { Body, Controller, Get, Post, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import type { AuthenticatedUser } from "../../common/utils/authenticated-user.interface";
import { loadRuntimeConfig } from "../../config/runtime-config";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

const TOKEN_COOKIE = "access_token";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ short: { ttl: 60000, limit: 5 }, medium: { ttl: 600000, limit: 15 }, long: { ttl: 86400000, limit: 50 } })
  @Post("login")
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    const config = loadRuntimeConfig();
    const isProduction = config.nodeEnv === "production" || config.nodeEnv === "staging";

    res.cookie(TOKEN_COOKIE, result.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      path: "/",
      maxAge: 60 * 60 * 1000, // 1 hour (matches JWT_EXPIRES_IN default)
    });

    return result;
  }

  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id, user.organizationId);
  }

  @Public()
  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(TOKEN_COOKIE, { path: "/" });
    return { ok: true };
  }
}
