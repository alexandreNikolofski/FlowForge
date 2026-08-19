export const JOB_RETRY_DELAYS_MS = [1000, 5000, 30000, 120000] as const;
export const MAX_JOB_ATTEMPTS = 5;

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
