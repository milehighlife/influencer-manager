import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

const pingMock: jest.Mock = jest.fn();
const quitMock: jest.Mock = jest.fn();
const disconnectMock: jest.Mock = jest.fn();

jest.mock("ioredis", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    ping: pingMock,
    quit: quitMock,
    disconnect: disconnectMock,
  })),
}));

import {
  resetRuntimeConfigForTests,
} from "../src/config/runtime-config";
import { HealthService } from "../src/modules/health/health.service";

describe("HealthService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  beforeEach(() => {
    pingMock.mockReset();
    quitMock.mockReset();
    disconnectMock.mockReset();
    quitMock.mockImplementation(async () => "OK");
    resetRuntimeConfigForTests();
  });

  it("returns ok when database is healthy and redis checks are disabled", async () => {
    const prisma = {
      $queryRaw: jest.fn(async () => [{ "?column?": 1 }]),
    } as any;

    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/test_db";
    process.env.JWT_SECRET = "test-secret-12345678901234567890";
    process.env.REDIS_HEALTHCHECK_ENABLED = "false";

    const service = new HealthService(prisma);
    const readiness = await service.getReadiness();

    expect(readiness.status).toBe("ok");
    expect(readiness.dependencies.database.status).toBe("ok");
    expect(readiness.dependencies.redis.status).toBe("skipped");
    expect(pingMock).not.toHaveBeenCalled();
  });

  it("returns error when redis ping fails", async () => {
    const prisma = {
      $queryRaw: jest.fn(async () => [{ "?column?": 1 }]),
    } as any;

    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/test_db";
    process.env.JWT_SECRET = "test-secret-12345678901234567890";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.REDIS_HEALTHCHECK_ENABLED = "true";

    pingMock.mockImplementation(async () => {
      throw new Error("connect ECONNREFUSED");
    });

    const service = new HealthService(prisma);
    const readiness = await service.getReadiness();

    expect(readiness.status).toBe("error");
    expect(readiness.dependencies.database.status).toBe("ok");
    expect(readiness.dependencies.redis.status).toBe("error");
    expect(readiness.dependencies.redis.detail).toContain("ECONNREFUSED");
    expect(quitMock).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    process.env = originalEnv;
    resetRuntimeConfigForTests();
  });
});
