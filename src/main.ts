import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { initOtel, shutdownOtel } from './otel';

async function bootstrap() {
  await initOtel();
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('FlowForge API')
    .setDescription('Distributed job processing platform for async workloads and background execution.')
    .setVersion('1.0')
    .addTag('jobs')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);

  const shutdown = async () => {
    await app.close();
    await shutdownOtel();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap();
