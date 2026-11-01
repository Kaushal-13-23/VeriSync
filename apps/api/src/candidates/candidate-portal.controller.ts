import { Controller, Get } from '@nestjs/common';
import { CandidatePortalService } from './candidate-portal.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('candidate')
export class CandidatePortalController {
  constructor(private readonly portalService: CandidatePortalService) {}

  /**
   * Get assigned assessments with eligibility, status, and attempt limits (FR-UI-001, UC-08).
   * Verified by TC09: zero answer keys, options correct status, or hidden test cases.
   */
  @Roles(UserRole.CANDIDATE)
  @Get('assessments')
  async getAssignedAssessments(@CurrentUser('userId') userId: string) {
    return this.portalService.getAssignedAssessments(userId);
  }
}
