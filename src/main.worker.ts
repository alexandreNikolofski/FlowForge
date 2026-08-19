import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Worker } from 'bullmq';
import { JobsProcessor } from './modules/jobs/jobs.processor';
import { initOtel, shutdownOtel } from './otel';

async function bootstrap() {
  await initOtel();
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('FlowForge worker is running');

  await app.init();

  // Resolve the JobsProcessor provider and create a BullMQ Worker
  const jobsProcessor = app.get(JobsProcessor);

  const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 10);
  const connection = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
  };

  const worker = new Worker(
    'jobs',
    async (job) => {
      // Delegate processing to the Nest provider method
      return jobsProcessor.process(job as any);
    },
    {
      connection,
      concurrency,
    },
  );

  const shutdown = async () => {
    console.log('Shutting down worker...');
    try {
      await worker.close();
    } catch (e) {
      console.error('Error closing worker', e);
    }
    await app.close();
    await shutdownOtel();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap();
