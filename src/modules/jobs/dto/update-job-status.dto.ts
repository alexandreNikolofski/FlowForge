import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum UpdateJobStatusValue {
  WAITING = 'WAITING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

export class UpdateJobStatusDto {
  @ApiProperty({
    enum: UpdateJobStatusValue,
    description: 'New operational status for the job.',
  })
  @IsEnum(UpdateJobStatusValue)
  status: UpdateJobStatusValue;

  @ApiPropertyOptional({
    description: 'Optional error message captured when a job fails or retries.',
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}
