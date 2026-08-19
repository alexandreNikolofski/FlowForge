import { Prisma, PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const jobs: Prisma.JobCreateInput[] = [
    {
      type: 'send_email',
      payload: { to: 'demo@flowforge.dev', template: 'welcome' },
      priority: 'HIGH',
      idempotencyKey: 'demo:send-email:1',
      status: 'WAITING',
    },
    {
      type: 'generate_report',
      payload: { reportId: 'rpt-001', owner: 'analytics' },
      priority: 'NORMAL',
      idempotencyKey: 'demo:generate-report:1',
      status: 'WAITING',
    },
    {
      type: 'process_image',
      payload: { source: 's3://bucket/demo.png', width: 1280 },
      priority: 'LOW',
      idempotencyKey: 'demo:process-image:1',
      status: 'WAITING',
    },
  ];

  for (const job of jobs) {
    await prisma.job.create({ data: job });
  }

  console.log('Demo jobs created successfully');
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Failed to seed demo jobs', error);
  process.exit(1);
});
