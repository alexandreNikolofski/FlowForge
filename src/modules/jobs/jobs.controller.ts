import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new async job in the queue' })
  @ApiBody({ type: CreateJobDto })
  @ApiResponse({ status: 201, description: 'Job created successfully.' })
  async create(@Body() createJobDto: CreateJobDto) {
    return this.jobsService.create({
      type: createJobDto.type,
      payload: createJobDto.payload ?? {},
      priority: createJobDto.priority,
      scheduledAt: createJobDto.scheduledAt,
      idempotencyKey: createJobDto.idempotencyKey,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List jobs with optional status filter' })
  @ApiQuery({ name: 'status', required: false, type: String })
  async findAll(@Query('status') status?: string) {
    return this.jobsService.findAll(status);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Return a simple job metrics summary' })
  async getMetrics() {
    return this.jobsService.getMetrics();
  }

  @Get('retries')
  @ApiOperation({ summary: 'Return the current retry profile' })
  async getRetryDelays() {
    return {
      retries: this.jobsService.getRetryDelays(),
    };
  }

  @Get('dlq')
  @ApiOperation({ summary: 'List failed jobs retained in the dead-letter queue' })
  async getDeadLetterQueue() {
    return this.jobsService.getDeadLetterJobs();
  }

  @Post(':id/replay')
  @ApiOperation({ summary: 'Replay a dead-letter job by id' })
  @ApiParam({ name: 'id', type: String })
  async replay(@Param('id') id: string) {
    return this.jobsService.replayJob(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a specific job by id' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update a job status manually' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateJobStatusDto })
  async updateStatus(@Param('id') id: string, @Body() updateJobStatusDto: UpdateJobStatusDto) {
    return this.jobsService.updateStatus(id, updateJobStatusDto.status, updateJobStatusDto.errorMessage);
  }
}
