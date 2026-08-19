import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export enum JobPriorityDto {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
}

export enum JobTypeDto {
  SEND_EMAIL = 'send_email',
  GENERATE_REPORT = 'generate_report',
  PROCESS_IMAGE = 'process_image',
  WEBHOOK = 'webhook',
  NOTIFICATION = 'notification',
  IMPORT_FILE = 'import_file',
  DATA_PROCESSING = 'data_processing',
}

export class CreateJobDto {
  @ApiProperty({
    enum: JobTypeDto,
    example: JobTypeDto.SEND_EMAIL,
    description: 'Type of the asynchronous job to be processed in the background queue.',
  })
  @IsEnum(JobTypeDto)
  type: JobTypeDto;

  @ApiProperty({
    example: { to: 'user@example.com', template: 'welcome' },
    description: 'Payload specific to the job type.',
  })
  @IsObject()
  payload: Record<string, unknown>;

  @ApiPropertyOptional({
    enum: JobPriorityDto,
    example: JobPriorityDto.NORMAL,
    description: 'Processing priority. Higher priority jobs are prioritized by the queue worker.',
  })
  @IsOptional()
  @IsEnum(JobPriorityDto)
  priority?: JobPriorityDto;

  @ApiPropertyOptional({
    example: '2026-08-20T08:00:00.000Z',
    description: 'Optional scheduled execution time for delayed jobs.',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({
    example: 'user:welcome-email:123',
    description: 'Unique idempotency key to prevent duplicate processing of the same job.',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
