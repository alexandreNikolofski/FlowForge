import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { JOB_RETRY_DELAYS_MS, JOB_STATUS, MAX_JOB_ATTEMPTS } from './jobs.constants';

@Processor('jobs')
@Injectable()
export class JobsProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('jobs-dlq') private readonly deadLetterQueue: Queue,
  ) {
    super();
  }

  // Configure worker concurrency via environment variable `WORKER_CONCURRENCY`.
  // Defaults to 10 if not provided.
  getWorkerOptions() {
    const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 10);
    return { concurrency } as any;
  }

  async process(job: Job): Promise<unknown> {
    const { id, type, payload } = job.data;

    await this.prisma.job.update({
      where: { id },
      data: {
        status: JOB_STATUS.PROCESSING,
        attempts: { increment: 1 },
        startedAt: new Date(),
      },
    });

    try {
      switch (type) {
        case 'send_email':
        case 'generate_report':
        case 'process_image':
        case 'webhook':
        case 'notification':
        case 'import_file':
        case 'data_processing':
          await this.prisma.job.update({
            where: { id },
            data: {
              status: JOB_STATUS.COMPLETED,
              result: { ok: true, type, payload, status: 'processed', jobId: id },
              completedAt: new Date(),
            },
          });

          return {
            ok: true,
            type,
            payload,
            status: 'processed',
            jobId: id,
          };
        default:
          throw new Error(`Unsupported job type: ${String(type)}`);
      }
    } catch (error) {
      const persistedAttempt =
        (await this.prisma.job.findUnique({ where: { id }, select: { attempts: true } }))?.attempts ?? 0;
      const shouldRetry = persistedAttempt < MAX_JOB_ATTEMPTS;
      const message = error instanceof Error ? error.message : 'Unknown processing error';

      await this.prisma.job.update({
        where: { id },
        data: {
          status: shouldRetry ? JOB_STATUS.RETRYING : JOB_STATUS.FAILED,
          errorMessage: message,
          completedAt: shouldRetry ? null : new Date(),
        },
      });

      if (shouldRetry) {
        const delay =
          JOB_RETRY_DELAYS_MS[Math.min(persistedAttempt - 1, JOB_RETRY_DELAYS_MS.length - 1)] ?? 1000;
        throw new Error(`Retry scheduled for ${delay}ms`);
      }

      await this.deadLetterQueue.add(
        'dead-letter-job',
        {
          originalJobId: id,
          type,
          payload,
          failedAt: new Date().toISOString(),
          reason: message,
        },
        {
          jobId: `dlq-${id}`,
          removeOnComplete: true,
        },
      );

      throw error;
    }
  }
}
