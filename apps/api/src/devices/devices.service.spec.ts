import { Test, TestingModule } from '@nestjs/testing';
import { DevicesService } from './devices.service';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ApiErrorCode, AuditOutcome } from '@verisync/shared';
import { ApiErrorException } from '../common/api-error.exception';

describe('DevicesService (FR-LAB-001..006, BR-015, TC-16)', () => {
  let service: DevicesService;
  let prisma: any;
  let audit: any;

  const mockDevice = {
    id: 'dev-lab-01',
    deviceReference: 'LAB-ROOM-A-PC01',
    hostname: 'pc01.lab.local',
    ipAddress: '192.168.1.101',
    macAddress: 'AA:BB:CC:DD:EE:01',
    location: 'Lab A - Seat 01',
    approvedClientVersion: '1.4.0',
    deviceStatus: 'ACTIVE' as const,
    notes: 'Primary lab machine',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSeenAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      labDevice: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      assessmentSession: {
        findUnique: jest.fn(),
      },
    };

    audit = {
      log: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
  });

  describe('FR-LAB-001: Device Registration', () => {
    it('should register a new lab device successfully and audit it', async () => {
      prisma.labDevice.findUnique.mockResolvedValue(null);
      prisma.labDevice.create.mockResolvedValue(mockDevice);

      const result = await service.registerDevice(
        'admin-user-1',
        {
          deviceReference: 'LAB-ROOM-A-PC01',
          hostname: 'pc01.lab.local',
          ipAddress: '192.168.1.101',
          macAddress: 'AA:BB:CC:DD:EE:01',
          location: 'Lab A - Seat 01',
          approvedClientVersion: '1.4.0',
        },
        'corr-reg-1',
        '192.168.1.10',
      );

      expect(result).toBeDefined();
      expect(result.deviceReference).toBe('LAB-ROOM-A-PC01');
      expect(prisma.labDevice.create).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'admin-user-1',
          eventType: 'DEVICE_REGISTERED',
          outcome: AuditOutcome.SUCCESS,
        }),
      );
    });

    it('should reject registration if device reference already exists', async () => {
      prisma.labDevice.findUnique.mockResolvedValue(mockDevice);

      await expect(
        service.registerDevice(
          'admin-user-1',
          {
            deviceReference: 'LAB-ROOM-A-PC01',
            approvedClientVersion: '1.4.0',
          },
          'corr-reg-2',
          '192.168.1.10',
        ),
      ).rejects.toThrow(ApiErrorException);
    });
  });

  describe('FR-LAB-002: Device Status Management (Activate / Block / Suspend)', () => {
    it('should update device status to BLOCKED and record audit log with reason (Non-negotiable Rule 7)', async () => {
      prisma.labDevice.findUnique.mockResolvedValue(mockDevice);
      const blockedDevice = { ...mockDevice, deviceStatus: 'BLOCKED' as const };
      prisma.labDevice.update.mockResolvedValue(blockedDevice);

      const result = await service.updateDeviceStatus(
        'admin-user-1',
        'dev-lab-01',
        { status: 'BLOCKED', reason: 'Suspected hardware tampering' },
        'corr-status-1',
        '192.168.1.10',
      );

      expect(result.deviceStatus).toBe('BLOCKED');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'admin-user-1',
          eventType: 'DEVICE_STATUS_CHANGED',
          metadata: expect.objectContaining({
            deviceReference: 'LAB-ROOM-A-PC01',
            oldStatus: 'ACTIVE',
            newStatus: 'BLOCKED',
            reason: 'Suspected hardware tampering',
          }),
        }),
      );
    });

    it('should update device status to ACTIVE (activation)', async () => {
      const pendingDevice = { ...mockDevice, deviceStatus: 'INACTIVE' as const };
      prisma.labDevice.findUnique.mockResolvedValue(pendingDevice);
      prisma.labDevice.update.mockResolvedValue({ ...mockDevice, deviceStatus: 'ACTIVE' as const });

      const result = await service.updateDeviceStatus(
        'admin-user-1',
        'dev-lab-01',
        { status: 'ACTIVE', reason: 'Device validated by lab admin' },
        'corr-status-2',
        '192.168.1.10',
      );

      expect(result.deviceStatus).toBe('ACTIVE');
    });
  });

  describe('FR-LAB-003 & 004: Approved Client Version & Unsupported Rejection (426)', () => {
    it('should update approved version and record audit', async () => {
      prisma.labDevice.findUnique.mockResolvedValue(mockDevice);
      prisma.labDevice.update.mockResolvedValue({ ...mockDevice, approvedClientVersion: '2.0.0' });

      const result = await service.updateApprovedVersion(
        'admin-user-1',
        'dev-lab-01',
        { approvedClientVersion: '2.0.0', reason: 'Scheduled platform release v2.0' },
        'corr-ver-1',
        '192.168.1.10',
      );

      expect(result.approvedClientVersion).toBe('2.0.0');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'DEVICE_VERSION_UPDATED',
        }),
      );
    });

    it('should reject mismatched client version with 426 UNSUPPORTED_CLIENT (FR-LAB-003, TC-16)', async () => {
      prisma.labDevice.findUnique.mockResolvedValue(mockDevice); // approvedClientVersion is 1.4.0

      try {
        await service.validateDeviceAndVersion('LAB-ROOM-A-PC01', '1.3.9');
        fail('Should have thrown ApiErrorException');
      } catch (err: any) {
        expect(err.getStatus()).toBe(426);
        expect(err.code).toBe(ApiErrorCode.UNSUPPORTED_CLIENT);
      }
    });

    it('should accept matching client version and update lastSeenAt', async () => {
      prisma.labDevice.findUnique.mockResolvedValue(mockDevice); // approvedClientVersion is 1.4.0
      prisma.labDevice.update.mockResolvedValue(mockDevice);

      const device = await service.validateDeviceAndVersion('LAB-ROOM-A-PC01', '1.4.0');
      expect(device.deviceReference).toBe('LAB-ROOM-A-PC01');
      expect(prisma.labDevice.update).toHaveBeenCalled();
    });

    it('should reject if device is BLOCKED or SUSPENDED', async () => {
      prisma.labDevice.findUnique.mockResolvedValue({
        ...mockDevice,
        deviceStatus: 'BLOCKED' as const,
      });

      await expect(service.validateDeviceAndVersion('LAB-ROOM-A-PC01', '1.4.0')).rejects.toThrow(
        ApiErrorException,
      );
    });
  });

  describe('FR-LAB-006 & BR-015: Client Lockdown Event Ingestion', () => {
    it('should ingest focus loss event into audit_logs without penalizing or terminating session (BR-015, SRS 11.4)', async () => {
      const response = await service.recordLockdownEvent(
        'cand-user-100',
        {
          eventType: 'FOCUS_LOST',
          clientTimestamp: new Date().toISOString(),
          processName: 'chrome.exe',
          windowTitle: 'Google Search - Cheat Sheet',
          details: { durationMs: 1500 },
        },
        'corr-lockdown-1',
        '192.168.1.101',
      );

      expect(response.recorded).toBe(true);
      expect(response.eventId).toBe('audit-1');
      expect(response.serverTime).toBeDefined();

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'cand-user-100',
          eventType: 'LOCKDOWN_FOCUS_LOST',
          outcome: AuditOutcome.SUCCESS,
          metadata: expect.objectContaining({
            processName: 'chrome.exe',
            windowTitle: 'Google Search - Cheat Sheet',
            note: expect.stringContaining('zero automatic candidate penalty applied'),
          }),
        }),
      );
    });

    it('should ingest exit attempt and prohibited process events as telemetry', async () => {
      const response = await service.recordLockdownEvent(
        'cand-user-101',
        {
          eventType: 'PROHIBITED_PROCESS_DETECTED',
          clientTimestamp: new Date().toISOString(),
          processName: 'wireshark.exe',
        },
        'corr-lockdown-2',
        '192.168.1.101',
      );

      expect(response.recorded).toBe(true);
      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe('System Policies & Lab Device Listing', () => {
    it('should return system lockdown policies (FR-CONF-004)', async () => {
      const policies = await service.getSystemPolicies();
      expect(policies.approvedClientVersion).toBeDefined();
      expect(policies.minimumClientVersion).toBeDefined();
      expect(policies.lockdownEnabled).toBe(true);
    });

    it('should list devices with optional status filter', async () => {
      prisma.labDevice.findMany.mockResolvedValue([mockDevice]);
      const list = await service.listDevices('ACTIVE');
      expect(list).toHaveLength(1);
      expect(prisma.labDevice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deviceStatus: 'ACTIVE' },
        }),
      );
    });
  });
});
