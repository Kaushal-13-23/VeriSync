import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, PurgeRetentionResultDto, RetentionSettingsDto } from '@verisync/shared';
import { UpdateRetentionSettingsDto } from '../coding/dto/code-submission.dto';

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  private readonly DEFAULT_SOURCE_CODE_DAYS = 90;
  private readonly DEFAULT_RESULT_DAYS = 365;
  private readonly DEFAULT_AUTO_PURGE = true;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Get retention policy settings (FR-CODE-014, SRS 9.3)
   */
  async getSettings(): Promise<RetentionSettingsDto> {
    const sourceCodeSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'source_code_retention_days' },
    });
    const resultSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'result_retention_days' },
    });
    const autoPurgeSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'auto_purge_enabled' },
    });

    return {
      sourceCodeRetentionDays: sourceCodeSetting
        ? parseInt(sourceCodeSetting.value, 10)
        : this.DEFAULT_SOURCE_CODE_DAYS,
      resultRetentionDays: resultSetting
        ? parseInt(resultSetting.value, 10)
        : this.DEFAULT_RESULT_DAYS,
      autoPurgeEnabled: autoPurgeSetting
        ? autoPurgeSetting.value === 'true'
        : this.DEFAULT_AUTO_PURGE,
    };
  }

  /**
   * Update retention policy settings (FR-CODE-014, Rule 7)
   */
  async updateSettings(
    actorUserId: string,
    dto: UpdateRetentionSettingsDto,
    correlationId: string,
    _clientIp: string,
  ): Promise<RetentionSettingsDto> {
    const now = new Date();

    if (dto.sourceCodeRetentionDays !== undefined) {
      await this.prisma.systemSetting.upsert({
        where: { key: 'source_code_retention_days' },
        update: {
          value: dto.sourceCodeRetentionDays.toString(),
          updatedBy: actorUserId,
          updatedAt: now,
        },
        create: {
          key: 'source_code_retention_days',
          value: dto.sourceCodeRetentionDays.toString(),
          updatedBy: actorUserId,
          updatedAt: now,
        },
      });
    }

    if (dto.resultRetentionDays !== undefined) {
      await this.prisma.systemSetting.upsert({
        where: { key: 'result_retention_days' },
        update: {
          value: dto.resultRetentionDays.toString(),
          updatedBy: actorUserId,
          updatedAt: now,
        },
        create: {
          key: 'result_retention_days',
          value: dto.resultRetentionDays.toString(),
          updatedBy: actorUserId,
          updatedAt: now,
        },
      });
    }

    if (dto.autoPurgeEnabled !== undefined) {
      await this.prisma.systemSetting.upsert({
        where: { key: 'auto_purge_enabled' },
        update: {
          value: dto.autoPurgeEnabled ? 'true' : 'false',
          updatedBy: actorUserId,
          updatedAt: now,
        },
        create: {
          key: 'auto_purge_enabled',
          value: dto.autoPurgeEnabled ? 'true' : 'false',
          updatedBy: actorUserId,
          updatedAt: now,
        },
      });
    }

    await this.audit.log({
      actorUserId,
      eventType: 'UPDATE_RETENTION_SETTINGS',
      affectedEntity: 'system_settings',
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        dto,
        updatedAt: now.toISOString(),
      },
    });

    return this.getSettings();
  }

  /**
   * Purge expired code submissions beyond configured retention period (FR-CODE-014)
   */
  async purgeExpiredSubmissions(
    actorUserId?: string,
    correlationId?: string,
  ): Promise<PurgeRetentionResultDto> {
    const settings = await this.getSettings();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - settings.sourceCodeRetentionDays);

    const deleteResult = await this.prisma.codingSubmission.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(
      `[purgeExpiredSubmissions] Purged ${deleteResult.count} expired code submissions older than ${cutoffDate.toISOString()}`,
    );

    if (actorUserId) {
      await this.audit.log({
        actorUserId,
        eventType: 'PURGE_RETENTION_RECORDS',
        affectedEntity: 'coding_submissions',
        outcome: AuditOutcome.SUCCESS,
        correlationId: correlationId || `purge-${Date.now()}`,
        metadata: {
          cutoffDate: cutoffDate.toISOString(),
          purgedCount: deleteResult.count,
        },
      });
    }

    return {
      purgedSubmissionsCount: deleteResult.count,
      purgedAt: new Date().toISOString(),
    };
  }
}
