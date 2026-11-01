import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import {
  CreateAssessmentDto,
  UpdateAssessmentDto,
  MapAssessmentQuestionsDto,
  UpdateAssessmentStatusDto,
} from './dto/assessment.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from '../common/correlation-id.middleware';

@Controller('admin/assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  /**
   * Create assessment in DRAFT status (FR-ASMT-001, FR-ASMT-002).
   */
  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAssessment(
    @Body() dto: CreateAssessmentDto,
    @CurrentUser('userId') actorUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    return this.assessmentsService.createAssessment(dto, actorUserId, correlationId);
  }

  /**
   * List assessments with optional status or roleCategory filters.
   */
  @Roles(UserRole.SUPER_ADMIN, UserRole.TECHNICAL_EVALUATOR)
  @Get()
  async listAssessments(
    @Query('status') status?: string,
    @Query('roleCategory') roleCategory?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.assessmentsService.listAssessments({
      status,
      roleCategory,
      search,
      page,
      limit,
    });
  }

  /**
   * Get assessment details with mapped questions.
   */
  @Roles(UserRole.SUPER_ADMIN, UserRole.TECHNICAL_EVALUATOR)
  @Get(':id')
  async getAssessmentById(@Param('id') id: string) {
    return this.assessmentsService.getAssessmentById(id);
  }

  /**
   * Edit assessment before candidate commencement (FR-ASMT-003).
   */
  @Roles(UserRole.SUPER_ADMIN)
  @Put(':id')
  async updateAssessment(
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentDto,
    @CurrentUser('userId') actorUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    return this.assessmentsService.updateAssessment(id, dto, actorUserId, correlationId);
  }

  /**
   * Map questions with limits, order, and overall duration validation (FR-ASMT-002, FR-ASMT-004, UC-05).
   */
  @Roles(UserRole.SUPER_ADMIN)
  @Post(':id/questions')
  @HttpCode(HttpStatus.OK)
  async mapQuestions(
    @Param('id') id: string,
    @Body() dto: MapAssessmentQuestionsDto,
    @CurrentUser('userId') actorUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    return this.assessmentsService.mapQuestions(id, dto, actorUserId, correlationId);
  }

  /**
   * Publish assessment, freezing immutable versioned snapshot (FR-ASMT-003, FR-ASMT-008, UC-05).
   */
  @Roles(UserRole.SUPER_ADMIN)
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  async publishAssessment(
    @Param('id') id: string,
    @CurrentUser('userId') actorUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    return this.assessmentsService.publishAssessment(id, actorUserId, correlationId);
  }

  /**
   * Transition assessment state machine (FR-ASMT-005).
   */
  @Roles(UserRole.SUPER_ADMIN)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentStatusDto,
    @CurrentUser('userId') actorUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    return this.assessmentsService.updateStatus(id, dto, actorUserId, correlationId);
  }
}
