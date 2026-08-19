import { JobsService } from './jobs.service';

describe('JobsService', () => {
  it('should return an existing job when the same idempotency key is used again', async () => {
    const existingJob = {
      id: 'job-123',
      type: 'send_email',
      payload: { to: 'user@example.com' },
      status: 'WAITING',
      priority: 'NORMAL',
      idempotencyKey: 'duplicate-key',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const prisma = {
      job: {
        findFirst: jest.fn().mockResolvedValue(existingJob),
        create: jest.fn(),
      },
    };

    const jobsQueue = {
      add: jest.fn(),
    };

    const deadLetterQueue = {
      add: jest.fn(),
    };

    const service = new JobsService(
      prisma as any,
      jobsQueue as any,
      deadLetterQueue as any,
    );

    const result = await service.create({
      type: 'send_email',
      payload: { to: 'user@example.com' },
      idempotencyKey: 'duplicate-key',
    });

    expect(result).toEqual(existingJob);
    expect(prisma.job.findFirst).toHaveBeenCalledWith({
      where: { idempotencyKey: 'duplicate-key' },
    });
    expect(prisma.job.create).not.toHaveBeenCalled();
    expect(jobsQueue.add).not.toHaveBeenCalled();
  });
});
