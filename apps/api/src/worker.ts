import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { loadRuntimeConfig } from "./config/runtime-config";

async function bootstrapWorker() {
  const config = loadRuntimeConfig();

  if (!config.enableJobWorkers) {
    throw new Error(
      "ENABLE_JOB_WORKERS must be true when starting the worker process.",
    );
  }

  const app = await NestFactory.createApplicationContext(AppModule);

  Logger.log("Worker process started.", "WorkerBootstrap");

  const shutdown = async (signal: string) => {
    Logger.log(`Worker received ${signal}. Shutting down.`, "WorkerBootstrap");
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

void bootstrapWorker();
