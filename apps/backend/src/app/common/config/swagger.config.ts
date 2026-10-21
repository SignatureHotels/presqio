import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
export function configureSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle("Presqio Attendance API")
    .setDescription("Presqio API: admin auth, organizations and businesses.")
    .addBearerAuth()
    .setVersion("0.1.0")
    .build();
  SwaggerModule.setup(
    "api/docs",
    app,
    SwaggerModule.createDocument(app, config),
  );
}
