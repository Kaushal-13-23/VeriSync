import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import {
  CreateCandidateDto,
  UpdateCandidateDto,
  BulkImportCandidatesDto,
  AssignAssessmentDto,
  UnassignAssessmentDto,
} from './dto/candidate.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from '../common/correlation-id.middleware';

@Controller('admin/candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  /**
   * Create candidate record with complete profile and provision temporary credentials (FR-CAN-001, FR-CAN-007, FR-AUTH-009, UC-02).
   */
  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCandidate(
    @Body() dto: CreateCandidateDto,
    @CurrentUser('userId') actorUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    return this.candidatesService.createCandidate(dto, actorUserId, correlationId);
  }

  /**
   * Search and filter candidates by ID, name, email, institution, drive, and status (FR-CAN-004).
   */
  @Roles(UserRole.SUPER_ADMIN, UserRole.TECHNICAL_EVALUATOR)
  @Get()
  async listCandidates(
    @Query('search') search?: string,
    @Query('recruitmentReference') recruitmentReference?: string,
    @Query('institution') institution?: string,
    @Query('accountStatus') accountStatus?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.candidatesService.listCandidates({
      search,
      recruitmentReference,
      institution,
      accountStatus,
      page,
      limit,
    });
  }

  /**
   * Bulk import candidates via CSV with template validation and per-row error reporting (FR-CAN-003, UC-03).
   */
  @Roles(UserRole.SUPER_ADMIN)
  @Post('bulk-import')
  @HttpCode(HttpStatus.OK)
  async bulkImportCandidates(
    @Body() dto: BulkImportCandidatesDto,
    @CurrentUser('userId') actorUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    return this.candidatesService.bulkImportCandidates(dto.csvData, actorUserId, correlationId);
  }

  /**
   * Assign assessment to candidate individuals or defined cohort/group (FR-CAN-004, FR-ASMT-005, UC-06).
   */
  @Roles(UserRole.SUPER_ADMIN)
  @Post('assign')
  @HttpCode(HttpStatus.OK)
  async assignAssessment(
    @Body() dto: AssignAssessmentDto,
    @CurrentUser('userId') actorUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    return this.candidatesService.assignAssessment(dto, actorUserId, correlationId);
  }

  /**
   * Revoke/remove candidate assignment before assessment start (FR-CAN-005).
   */
  @Roles(UserRole.SUPER_ADMIN)
  @Post('unassign')
  @HttpCode(HttpStatus.OK)
  async unassignAssessment(
    @Body() dto: UnassignAssessmentDto,
    @CurrentUser('userId') actorUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    return this.candidatesService.unassignAssessment(dto, actorUserId, correlationId);
  }

  /**
   * View candidate login and authentication history (FR-CAN-006).
   */
  @Roles(UserRole.SUPER_ADMIN)
  @Get(':id/login-history')
  async getLoginHistory(@Param('id') id: string) {
    return this.candidatesService.getCandidateLoginHistory(id);
  }

  /**
   * Get single candidate profile and assigned tests (FR-CAN-001).
   */
  @Roles(UserRole.SUPER_ADMIN, UserRole.TECHNICAL_EVALUATOR)
  @Get(':id')
  async getCandidateById(@Param('id') id: string) {
    return this.candidatesService.getCandidateById(id);
  }

  /**
   * Edit candidate details with audit logging (FR-CAN-002).
   */
  @Roles(UserRole.SUPER_ADMIN)
  @Put(':id')
  async updateCandidate(
    @Param('id') id: string,
    @Body() dto: UpdateCandidateDto,
    @CurrentUser('userId') actorUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const correlationId = req.correlationId || 'unknown';
    return this.candidatesService.updateCandidate(id, dto, actorUserId, correlationId);
  }
}
