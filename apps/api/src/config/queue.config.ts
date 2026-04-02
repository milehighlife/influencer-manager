import type { ConnectionOptions } from "bullmq";

import { loadRuntimeConfig } from "./runtime-config";

export function getQueueConnection(): ConnectionOptions {
  const config = loadRuntimeConfig();
  const redisUrl = config.redisUrl;

  if (redisUrl) {
    const parsedUrl = new URL(redisUrl);

    return {
      host: parsedUrl.hostname,
      port: Number(parsedUrl.port || 6379),
      db: Number(parsedUrl.pathname.replace("/", "") || 0),
      username: parsedUrl.username || undefined,
      password: parsedUrl.password || undefined,
      maxRetriesPerRequest: null,
    };
  }

  return {
    host: config.redisHost,
    port: config.redisPort,
    db: config.redisDb,
    username: config.redisUsername,
    password: config.redisPassword,
    maxRetriesPerRequest: null,
  };
}
