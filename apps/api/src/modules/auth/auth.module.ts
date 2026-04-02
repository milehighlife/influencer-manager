import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import type { JwtSignOptions } from "@nestjs/jwt";

import { loadRuntimeConfig } from "../../config/runtime-config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

const runtimeConfig = loadRuntimeConfig();
const jwtExpiresIn = (runtimeConfig.jwtExpiresIn ?? "1h") as NonNullable<
  JwtSignOptions["expiresIn"]
>;

@Module({
  imports: [
    JwtModule.register({
      secret: runtimeConfig.jwtSecret,
      signOptions: {
        expiresIn: jwtExpiresIn,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
