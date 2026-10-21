import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app/app.module";
import { ApiExceptionFilter } from "./app/common/filters/api-exception.filter";
import { requestIdMiddleware } from "./app/common/middlewares/request-id.middleware";
import { createValidationPipe } from "./app/common/pipes/validation.pipe";
import { configureSwagger } from "./app/common/config/swagger.config";
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  // Render terminates TLS in front of the API; trust its one proxy hop for req.ip.
  // Locally there is no proxy, so X-Forwarded-For must not be trusted (it would let
  // clients pick their own IP and bypass rate limits).
  if (config.get("NODE_ENV") === "production") app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cookieParser());
  // Check-in selfies arrive as base64 JSON (~100-800 KB); other bodies stay small in practice.
  // Registering this parser replaces Nest's default 100 KB JSON parser.
  app.useBodyParser("json", { limit: "1mb" });
  app.use(requestIdMiddleware);
  app.enableCors({
    origin: config.getOrThrow<string>("UI_ORIGIN"),
    credentials: true,
  });
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  if (config.get("NODE_ENV") !== "production") configureSwagger(app);
  await app.listen(config.getOrThrow<number>("PORT"), "0.0.0.0");
}
bootstrap().catch(() => {
  console.error(
    "API startup failed. Check environment and port configuration.",
  );
  process.exit(1);
});
