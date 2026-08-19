export const JOB_STATUS = {
  WAITING: 'WAITING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING',
} as const;

export const JOB_PRIORITY = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
} as const;

export const JOB_BACKOFF_MS = [1000, 5000, 30000, 120000] as const;

export function calculateRetryDelay(attempt: number): number {
  const safeAttempt = Math.max(0, attempt - 1);
  return JOB_BACKOFF_MS[safeAttempt] ?? JOB_BACKOFF_MS[JOB_BACKOFF_MS.length - 1];
}

export function normalizeStatus(status?: string): string | undefined {
  if (!status) {
    return undefined;
  }

  return status.toUpperCase();
}
