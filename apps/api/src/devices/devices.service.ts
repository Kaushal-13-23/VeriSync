import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ApiErrorException } from '../common/api-error.exception';
import {
  ApiErrorCode,
  DeviceStatus,
  LockdownEventResponseDto,
  SystemPoliciesDto,
} from '@verisync/shared';
import { AuditOutcome } from '@prisma/client';
import {
  RegisterDeviceDto,
  UpdateDeviceStatusDto,
  UpdateDeviceVersionDto,
  RecordLockdownEventDto,
} from './dto/device.dto';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  // Default platform client version policies (FR-CONF-001, FR-CONF-004)
  private defaultApprovedVersion = '1.1.0';
  private defaultMinVersion = '1.0.0';

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Register a new authorized lab device (FR-LAB-001, FR-LAB-002)
   */
  async registerDevice(
    actorUserId: string,
    dto: RegisterDeviceDto,
    correlationId: string,
    clientIp: string,
  ) {
    const existing = await this.prisma.labDevice.findUnique({
      where: { deviceReference: dto.deviceReference },
    });

    if (existing) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        `Device reference '${dto.deviceReference}' is already registered`,
      );
    }

    const device = await this.prisma.labDevice.create({
      data: {
        deviceReference: dto.deviceReference,
        approvedClientVersion: dto.approvedClientVersion || this.defaultApprovedVersion,
        hostname: dto.hostname || null,
        ipAddress: dto.ipAddress || null,
        macAddress: dto.macAddress || null,
        location: dto.location || null,
        notes: dto.notes || null,
        deviceStatus: 'ACTIVE',
      },
    });

    await this.auditService.log({
      actorUserId,
      eventType: 'DEVICE_REGISTERED',
      affectedEntity: `device:${device.id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        deviceReference: device.deviceReference,
        approvedClientVersion: device.approvedClientVersion,
        location: device.location,
        clientIp,
      },
    });

    return device;
  }

  /**
   * List all registered lab devices with optional filtering (FR-LAB-001)
   */
  async listDevices(status?: DeviceStatus, search?: string) {
    return this.prisma.labDevice.findMany({
      where: {
        ...(status ? { deviceStatus: status } : {}),
        ...(search
          ? {
              OR: [
                { deviceReference: { contains: search, mode: 'insensitive' } },
                { hostname: { contains: search, mode: 'insensitive' } },
                { location: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get device details and session history by ID
   */
  async getDeviceById(id: string) {
    const device = await this.prisma.labDevice.findUnique({
      where: { id },
      include: {
        sessions: {
          select: {
            id: true,
            sessionStatus: true,
            startedAt: true,
            submittedAt: true,
            assignment: {
              select: {
                candidate: {
                  select: {
                    candidateIdentifier: true,
                    fullName: true,
                  },
                },
              },
            },
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!device) {
      throw new ApiErrorException(
        ApiErrorCode.INVALID_STATE,
        `Lab device with ID '${id}' not found`,
      );
    }

    return device;
  }

  /**
   * Update device status (ACTIVE, SUSPENDED, BLOCKED) with audit trail (FR-LAB-004, Rule 7)
   */
  async updateDeviceStatus(
    actorUserId: string,
    id: string,
    dto: UpdateDeviceStatusDto,
    correlationId: string,
    clientIp: string,
  ) {
    const device = await this.getDeviceById(id);
    const oldStatus = device.deviceStatus;

    const updated = await this.prisma.labDevice.update({
      where: { id },
      data: {
        deviceStatus: dto.status,
      },
    });

    await this.auditService.log({
      actorUserId,
      eventType: 'DEVICE_STATUS_CHANGED',
      affectedEntity: `device:${id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        deviceReference: device.deviceReference,
        oldStatus,
        newStatus: dto.status,
        reason: dto.reason,
        clientIp,
      },
    });

    return updated;
  }

  /**
   * Update approved client version for a device (FR-LAB-003, FR-CONF-001, Rule 7)
   */
  async updateApprovedVersion(
    actorUserId: string,
    id: string,
    dto: UpdateDeviceVersionDto,
    correlationId: string,
    clientIp: string,
  ) {
    const device = await this.getDeviceById(id);
    const oldVersion = device.approvedClientVersion;

    const updated = await this.prisma.labDevice.update({
      where: { id },
      data: {
        approvedClientVersion: dto.approvedClientVersion,
      },
    });

    await this.auditService.log({
      actorUserId,
      eventType: 'DEVICE_VERSION_UPDATED',
      affectedEntity: `device:${id}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        deviceReference: device.deviceReference,
        oldVersion,
        newVersion: dto.approvedClientVersion,
        reason: dto.reason,
        clientIp,
      },
    });

    return updated;
  }

  /**
   * Ingest client lockdown security events into audit trail (FR-LAB-006, BR-015, SRS 11.4).
   * Crucially, recorded for audit monitoring without treating a single event as proof of cheating.
   */
  async recordLockdownEvent(
    candidateUserId: string,
    dto: RecordLockdownEventDto,
    correlationId: string,
    clientIp: string,
  ): Promise<LockdownEventResponseDto> {
    const logEntry = await this.auditService.log({
      actorUserId: candidateUserId,
      eventType: `LOCKDOWN_${dto.eventType.toUpperCase()}`,
      affectedEntity: `candidate:${candidateUserId}`,
      outcome: AuditOutcome.SUCCESS,
      correlationId,
      metadata: {
        clientTimestamp: dto.clientTimestamp,
        windowTitle: dto.windowTitle || null,
        processName: dto.processName || null,
        details: dto.details || {},
        clientIp,
        note: 'Incident recorded for proctoring review; zero automatic candidate penalty applied (SRS 11.4, BR-015)',
      },
    });

    return {
      recorded: true,
      eventId: logEntry.id,
      serverTime: new Date().toISOString(),
    };
  }

  /**
   * Dynamic retrieval of system operational policies by clients (FR-CONF-004)
   */
  async getSystemPolicies(): Promise<SystemPoliciesDto> {
    return {
      approvedClientVersion: this.defaultApprovedVersion,
      minimumClientVersion: this.defaultMinVersion,
      lockdownEnabled: true,
      serverTime: new Date().toISOString(),
    };
  }

  /**
   * Validates device registration and approved client version (FR-AUTH-010, FR-LAB-003, FR-LAB-004, TC-16)
   */
  async validateDeviceAndVersion(deviceReference: string, clientVersion: string) {
    const device = await this.prisma.labDevice.findUnique({
      where: { deviceReference },
    });

    if (!device) {
      throw new ApiErrorException(
        ApiErrorCode.FORBIDDEN,
        `Device '${deviceReference}' is not registered in the authorized lab device registry (FR-LAB-001, FR-AUTH-010)`,
      );
    }

    if (device.deviceStatus !== 'ACTIVE') {
      throw new ApiErrorException(
        ApiErrorCode.FORBIDDEN,
        `Lab device '${deviceReference}' status is ${device.deviceStatus}. Examinations are not permitted on suspended/blocked devices (FR-LAB-004).`,
      );
    }

    if (clientVersion && clientVersion !== device.approvedClientVersion) {
      throw new ApiErrorException(
        ApiErrorCode.UNSUPPORTED_CLIENT,
        `Installed client version (${clientVersion}) does not match approved version (${device.approvedClientVersion}). Update client before connecting (FR-LAB-003, TC-16).`,
        {
          approvedClientVersion: device.approvedClientVersion,
          reportedClientVersion: clientVersion,
        },
      );
    }

    // Update lastSeenAt
    await this.prisma.labDevice.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    });

    return device;
  }
}
