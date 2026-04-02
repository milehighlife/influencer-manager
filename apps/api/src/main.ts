import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { loadRuntimeConfig } from "./config/runtime-config";

async function bootstrap() {
  const config = loadRuntimeConfig();
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  app.enableShutdownHooks();
  app.setGlobalPrefix(config.apiBasePath);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  await app.listen(config.apiPort, config.apiHost);

  Logger.log(
    `API listening on http://${config.apiHost}:${config.apiPort}/${config.apiBasePath}`,
    "Bootstrap",
  );
}

void bootstrap();
