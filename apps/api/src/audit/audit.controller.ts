import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@verisync/shared';
import { AuditService } from './audit.service';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Search audit logs for administrative inspection (FR-AUD-001, FR-ADMIN-001)
   */
  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  async getAuditLogs(
    @Query('actorUserId') actorUserId?: string,
    @Query('eventType') eventType?: string,
    @Query('correlationId') correlationId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    return this.auditService.getAuditLogs({
      actorUserId,
      eventType,
      correlationId,
      limit: parsedLimit,
    });
  }

  /**
   * Verify cryptographic SHA-256 hash chain across audit entries (NFR-SEC-009, FR-AUD-004)
   */
  @Get('verify-chain')
  @Roles(UserRole.SUPER_ADMIN)
  async verifyAuditChain() {
    return this.auditService.verifyAuditChainIntegrity();
  }
}
