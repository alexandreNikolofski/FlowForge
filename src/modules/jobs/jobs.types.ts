export type JobPriority = 'LOW' | 'NORMAL' | 'HIGH';

export type JobType =
  | 'send_email'
  | 'generate_report'
  | 'process_image'
  | 'webhook'
  | 'notification'
  | 'import_file'
  | 'data_processing';

export interface JobPayload {
  [key: string]: unknown;
}
