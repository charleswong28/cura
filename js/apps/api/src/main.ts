import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      // Strip properties not in the DTO
      whitelist: true,
      // Throw on unknown properties
      forbidNonWhitelisted: true,
      // Auto-transform payloads to DTO instances
      transform: true,
    })
  );

  app.enableCors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://cura.com",
      "https://app.cura.com",
    ],
  });

  await app.listen(8000);
  console.log("API is running on http://localhost:8000");
  console.log("GraphQL Playground: http://localhost:8000/graphql");
}

bootstrap();
