import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";

import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { loadRuntimeConfig } from "./config/runtime-config";

async function bootstrap() {
  const config = loadRuntimeConfig();
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: config.corsAllowedOrigins.length > 0
        ? config.corsAllowedOrigins
        : false,
      credentials: true,
    },
  });

  app.use(cookieParser());
  app.enableShutdownHooks();
  app.setGlobalPrefix(config.apiBasePath);
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
    }),
  );

  await app.listen(config.apiPort, config.apiHost);

  Logger.log(
    `API listening on http://${config.apiHost}:${config.apiPort}/${config.apiBasePath}`,
    "Bootstrap",
  );
}

void bootstrap();
