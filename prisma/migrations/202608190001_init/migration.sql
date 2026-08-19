CREATE TYPE "JobStatus" AS ENUM ('WAITING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING');
CREATE TYPE "JobPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'WAITING',
    "priority" "JobPriority" NOT NULL DEFAULT 'NORMAL',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Job_idempotencyKey_key"
    ON "Job"("idempotencyKey");

CREATE INDEX "Job_status_priority_scheduledAt_idx"
    ON "Job"("status", "priority", "scheduledAt");

CREATE INDEX "Job_type_createdAt_idx"
    ON "Job"("type", "createdAt");
