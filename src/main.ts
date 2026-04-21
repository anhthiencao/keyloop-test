import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TraceIdInterceptor } from './common/interceptors/trace-id.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global middleware
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TraceIdInterceptor());

  // OpenAPI / Swagger
  const config = new DocumentBuilder()
    .setTitle('Unified Document Viewer')
    .setDescription(
      'Aggregates documents from Sales and Service systems by VIN. ' +
      'Parallel requests with circuit breaker resilience and partial failure support.',
    )
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application running on http://localhost:${port}`);
  console.log(`Swagger UI at http://localhost:${port}/api`);
}

bootstrap();
