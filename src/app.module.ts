import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.local'] }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLER_TTL ?? 60),
        limit: Number(process.env.THROTTLER_LIMIT ?? 100),
      },
    ]),
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
    PrismaModule,
    QueueModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
