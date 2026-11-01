import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@verisync/shared';
import { AuthenticatedRequest } from '../common/correlation-id.middleware';
import { RetentionService } from './retention.service';
import { UpdateRetentionSettingsDto } from '../coding/dto/code-submission.dto';

@Controller('admin/retention')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RetentionController {
  constructor(private readonly retentionService: RetentionService) {}

  /**
   * Get retention policy settings (FR-CODE-014, SRS 9.3)
   */
  @Get('settings')
  @Roles(UserRole.SUPER_ADMIN)
  async getSettings() {
    return this.retentionService.getSettings();
  }

  /**
   * Update retention policy settings (FR-CODE-014, Rule 7)
   */
  @Patch('settings')
  @Roles(UserRole.SUPER_ADMIN)
  async updateSettings(@Body() dto: UpdateRetentionSettingsDto, @Req() req: AuthenticatedRequest) {
    const actorUserId = req.user.sub || req.user.id;
    const correlationId =
      req.correlationId || (req.headers['x-correlation-id'] as string) || `cid-${Date.now()}`;
    const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    return this.retentionService.updateSettings(actorUserId, dto, correlationId, clientIp);
  }

  /**
   * Purge expired submissions past retention cutoff (FR-CODE-014)
   */
  @Post('purge')
  @Roles(UserRole.SUPER_ADMIN)
  async purgeExpiredSubmissions(@Req() req: AuthenticatedRequest) {
    const actorUserId = req.user.sub || req.user.id;
    const correlationId =
      req.correlationId || (req.headers['x-correlation-id'] as string) || `cid-${Date.now()}`;

    return this.retentionService.purgeExpiredSubmissions(actorUserId, correlationId);
  }
}
