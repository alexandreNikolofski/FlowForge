import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { JOB_RETRY_DELAYS_MS, JOB_STATUS, MAX_JOB_ATTEMPTS } from './jobs.constants';
import { register, Counter, Histogram } from 'prom-client';

@Processor('jobs')
@Injectable()
export class JobsProcessor extends WorkerHost {
  // Metrics (created once per processor instance)
  private readonly completedCounter: Counter<string>;
  private readonly failedCounter: Counter<string>;
  private readonly processingDuration: Histogram<string>;
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('jobs-dlq') private readonly deadLetterQueue: Queue,
  ) {
    super();

    // Initialize metrics once
    // @ts-ignore
    this.completedCounter = (register.getSingleMetric('flowforge_jobs_completed_total') as Counter<string>) ?? new Counter({ name: 'flowforge_jobs_completed_total', help: 'Total number of completed jobs' });
    // @ts-ignore
    this.failedCounter = (register.getSingleMetric('flowforge_jobs_failed_total') as Counter<string>) ?? new Counter({ name: 'flowforge_jobs_failed_total', help: 'Total number of failed jobs' });
    // @ts-ignore
    this.processingDuration = (register.getSingleMetric('flowforge_job_processing_duration_seconds') as Histogram<string>) ?? new Histogram({ name: 'flowforge_job_processing_duration_seconds', help: 'Job processing duration in seconds' });
  }

  async process(job: Job): Promise<unknown> {
    const { id, type, payload } = job.data;

    const startedAt = Date.now();

    

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

          // Metrics: mark completed and record processing duration
          this.completedCounter.inc();
          this.processingDuration.observe((Date.now() - startedAt) / 1000);

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
      const message = error instanceof Error ? error.message : 'Unknown processing error';

      // Determine whether BullMQ will retry this job based on job attempts
      const attemptsConfigured = Number(job.opts?.attempts ?? 1);
      const attemptsMade = Number(job.attemptsMade ?? 0);
      const willRetry = attemptsMade + 1 < attemptsConfigured;

      await this.prisma.job.update({
        where: { id },
        data: {
          status: willRetry ? JOB_STATUS.RETRYING : JOB_STATUS.FAILED,
          errorMessage: message,
          completedAt: willRetry ? null : new Date(),
        },
      });

      // Record metrics
      if (willRetry) {
        // nothing else: BullMQ will schedule retry according to its attempts/backoff config
      } else {
        // final failure -> push to DLQ
        this.failedCounter.inc();

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
      }

      // observe processing duration
      this.processingDuration.observe((Date.now() - startedAt) / 1000);

      throw error;
    }
    finally {
      // On success metrics are handled above; ensure duration recorded on success path
      // (no-op here because success path recorded it explicitly)
    }
  }
}
