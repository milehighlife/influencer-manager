import { describe, expect, it } from "@jest/globals";

import {
  loadRuntimeConfig,
  resetRuntimeConfigForTests,
} from "../src/config/runtime-config";

describe("runtime config", () => {
  it("parses a valid development configuration", () => {
    resetRuntimeConfigForTests();

    const config = loadRuntimeConfig({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/influencer_manager",
      JWT_SECRET: "development-secret-for-tests",
      REDIS_URL: "redis://localhost:6379",
      ENABLE_JOB_WORKERS: "false",
      API_PORT: "3100",
      API_HOST: "127.0.0.1",
      API_BASE_PATH: "/api/",
    });

    expect(config.nodeEnv).toBe("development");
    expect(config.apiPort).toBe(3100);
    expect(config.apiHost).toBe("127.0.0.1");
    expect(config.apiBasePath).toBe("api");
    expect(config.enableJobWorkers).toBe(false);
  });

  it("rejects a weak staging jwt secret", () => {
    resetRuntimeConfigForTests();

    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "staging",
        DATABASE_URL:
          "postgresql://postgres:postgres@localhost:5432/influencer_manager",
        JWT_SECRET: "development-only-secret",
      }),
    ).toThrow(
      "JWT_SECRET must be a strong non-default value in staging and production.",
    );
  });

  it("rejects an invalid api port", () => {
    resetRuntimeConfigForTests();

    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "development",
        DATABASE_URL:
          "postgresql://postgres:postgres@localhost:5432/influencer_manager",
        JWT_SECRET: "development-secret-for-tests",
        API_PORT: "0",
      }),
    ).toThrow("API_PORT must be a positive integer.");
  });
});
