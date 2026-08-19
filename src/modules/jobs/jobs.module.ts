import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsController } from './jobs.controller';
import { JobsProcessor } from './jobs.processor';
import { JobsService } from './jobs.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'jobs' }),
    BullModule.registerQueue({ name: 'jobs-dlq' }),
  ],
  controllers: [JobsController],
  providers: [JobsService, JobsProcessor],
  exports: [JobsService],
})
export class JobsModule { }
