import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { JOB_PRIORITY, JOB_STATUS, JOB_RETRY_DELAYS_MS } from './jobs.constants';
import { register, Counter } from 'prom-client';
import { JobPriority, JobType } from './jobs.types';
import { normalizeStatus } from './jobs.utils';

export interface CreateJobDto {
  type: JobType;
  payload: Record<string, unknown>;
  priority?: JobPriority;
  scheduledAt?: Date | string;
  idempotencyKey?: string;
}

@Injectable()
export class JobsService {
  // @ts-ignore
  private jobsCreatedCounter: Counter<string> =
    (register.getSingleMetric('flowforge_jobs_created_total') as Counter<string>) ??
    new Counter({ name: 'flowforge_jobs_created_total', help: 'Total number of created jobs' });

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('jobs') private readonly jobsQueue: Queue,
    @InjectQueue('jobs-dlq') private readonly deadLetterQueue: Queue,
  ) { }

  async create(createJobDto: CreateJobDto) {
    if (createJobDto.idempotencyKey) {
      const existingJob = await this.prisma.job.findFirst({
        where: { idempotencyKey: createJobDto.idempotencyKey },
      });

      if (existingJob) {
        return existingJob;
      }
    }

    let job;
    try {
      job = await this.prisma.job.create({
        data: {
          type: createJobDto.type,
          priority: createJobDto.priority ?? JOB_PRIORITY.NORMAL,
          payload: createJobDto.payload as Prisma.InputJsonValue,
          scheduledAt: createJobDto.scheduledAt ? new Date(createJobDto.scheduledAt) : null,
          idempotencyKey: createJobDto.idempotencyKey,
          status: JOB_STATUS.WAITING,
        },
      });
    } catch (err: any) {
      // Handle unique constraint violation for idempotency key (Prisma P2002)
      if (err?.code === 'P2002' && createJobDto.idempotencyKey) {
        const existing = await this.prisma.job.findFirst({ where: { idempotencyKey: createJobDto.idempotencyKey } });
        if (existing) return existing;
      }
      throw err;
    }

    // Increment created counter
    // @ts-ignore
    this.jobsCreatedCounter.inc();

    await this.jobsQueue.add(
      'process-job',
      {
        id: job.id,
        type: job.type,
        payload: job.payload,
      },
      {
        jobId: job.id,
        priority: this.toBullPriority(job.priority),
        delay: job.scheduledAt ? Math.max(0, new Date(job.scheduledAt).getTime() - Date.now()) : 0,
        attempts: 3,
        backoff: {
          type: 'fixed',
          delay: 1000,
        },
      },
    );

    return job;
  }

  async findAll(status?: string) {
    const normalizedStatus = normalizeStatus(status);

    return this.prisma.job.findMany({
      where: normalizedStatus ? { status: normalizedStatus as any } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException(`Job not found: ${id}`);
    }

    return job;
  }

  async updateStatus(id: string, status: string, errorMessage?: string) {
    const job = await this.findOne(id);

    const nextStatus = normalizeStatus(status) ?? job.status;

    return this.prisma.job.update({
      where: { id: job.id },
      data: {
        status: nextStatus as any,
        errorMessage,
        completedAt: nextStatus === JOB_STATUS.COMPLETED ? new Date() : job.completedAt,
      },
    });
  }

  async getMetrics() {
    const total = await this.prisma.job.count();
    const completed = await this.prisma.job.count({ where: { status: JOB_STATUS.COMPLETED } });
    const failed = await this.prisma.job.count({ where: { status: JOB_STATUS.FAILED } });
    const processing = await this.prisma.job.count({ where: { status: JOB_STATUS.PROCESSING } });

    return {
      totalJobs: total,
      completedJobs: completed,
      failedJobs: failed,
      activeJobs: processing,
      successRate: total === 0 ? 0 : Number(((completed / total) * 100).toFixed(2)),
    };
  }

  async getDeadLetterJobs() {
    const jobs = await this.deadLetterQueue.getJobs(['failed', 'waiting', 'delayed']);
    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      failedReason: job.failedReason,
    }));
  }

  /**
   * Replay a job from the dead-letter queue by database job id.
   * This will reset job attempts, set status to WAITING and enqueue it again.
   */
  async replayJob(id: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });

    if (!job) {
      throw new NotFoundException(`Job not found: ${id}`);
    }

    // Reset status and attempts in DB to allow reprocessing
    await this.prisma.job.update({
      where: { id },
      data: {
        status: JOB_STATUS.WAITING,
        attempts: 0,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      },
    });

    // Add a replay job to the main queue. Use a unique jobId to avoid collisions.
    const replayJobId = `replay-${id}-${Date.now()}`;

    await this.jobsQueue.add(
      'process-job',
      {
        id: job.id,
        type: job.type,
        payload: job.payload,
      },
      {
        jobId: replayJobId,
        priority: this.toBullPriority(job.priority as any),
        attempts: 3,
        backoff: { type: 'fixed', delay: 1000 },
      },
    );

    return { ok: true, replayJobId };
  }

  private toBullPriority(priority: JobPriority): number {
    const map: Record<JobPriority, number> = {
      LOW: 10,
      NORMAL: 20,
      HIGH: 30,
    };

    return map[priority];
  }

  getRetryDelays() {
    return [...JOB_RETRY_DELAYS_MS];
  }
}
