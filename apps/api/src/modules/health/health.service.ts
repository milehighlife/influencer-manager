import { Injectable } from "@nestjs/common";
import Redis from "ioredis";

import { loadRuntimeConfig } from "../../config/runtime-config";
import { PrismaService } from "../../database/prisma.service";

type DependencyStatus = "ok" | "error" | "skipped";

interface DependencyCheck {
  status: DependencyStatus;
  detail?: string;
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getLiveness() {
    const config = loadRuntimeConfig();

    return {
      status: "ok",
      service: "api",
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    const database = await this.checkDatabase();
    const redis = await this.checkRedis();
    const status =
      database.status === "error" || redis.status === "error" ? "error" : "ok";

    return {
      status,
      timestamp: new Date().toISOString(),
      dependencies: {
        database,
        redis,
      },
    };
  }

  private async checkDatabase(): Promise<DependencyCheck> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: "ok",
      };
    } catch (error) {
      return {
        status: "error",
        detail:
          error instanceof Error ? error.message : "Database health check failed.",
      };
    }
  }

  private async checkRedis(): Promise<DependencyCheck> {
    const config = loadRuntimeConfig();

    if (!config.redisHealthcheckEnabled) {
      return {
        status: "skipped",
        detail: "Redis health check disabled for this process.",
      };
    }

    const redis = config.redisUrl
      ? new Redis(config.redisUrl)
      : new Redis({
          host: config.redisHost,
          port: config.redisPort,
          db: config.redisDb,
          username: config.redisUsername,
          password: config.redisPassword,
          maxRetriesPerRequest: null,
        });

    try {
      const result = await redis.ping();

      return {
        status: result === "PONG" ? "ok" : "error",
        detail: result,
      };
    } catch (error) {
      return {
        status: "error",
        detail:
          error instanceof Error ? error.message : "Redis health check failed.",
      };
    } finally {
      await redis.quit().catch(() => {
        redis.disconnect();
      });
    }
  }
}
