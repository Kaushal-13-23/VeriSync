import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@verisync/shared';
import { AuthenticatedRequest } from '../common/correlation-id.middleware';
import { DevicesService } from './devices.service';
import {
  RegisterDeviceDto,
  UpdateDeviceStatusDto,
  UpdateDeviceVersionDto,
  RecordLockdownEventDto,
} from './dto/device.dto';
import { DeviceStatus } from '@verisync/shared';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  /**
   * Register a new authorized lab device (FR-LAB-001, FR-LAB-002)
   */
  @Post('admin/devices')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async registerDevice(@Body() dto: RegisterDeviceDto, @Req() req: AuthenticatedRequest) {
    const actorUserId = req.user.sub || req.user.id;
    const correlationId =
      req.correlationId || (req.headers['x-correlation-id'] as string) || `cid-${Date.now()}`;
    const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    return this.devicesService.registerDevice(actorUserId, dto, correlationId, clientIp);
  }

  /**
   * List registered lab devices (FR-LAB-001)
   */
  @Get('admin/devices')
  @Roles(UserRole.SUPER_ADMIN)
  async listDevices(@Query('status') status?: DeviceStatus, @Query('search') search?: string) {
    return this.devicesService.listDevices(status, search);
  }

  /**
   * Get lab device details (FR-LAB-001)
   */
  @Get('admin/devices/:id')
  @Roles(UserRole.SUPER_ADMIN)
  async getDeviceById(@Param('id') id: string) {
    return this.devicesService.getDeviceById(id);
  }

  /**
   * Update device status (ACTIVE, SUSPENDED, BLOCKED) (FR-LAB-004, Rule 7)
   */
  @Patch('admin/devices/:id/status')
  @Roles(UserRole.SUPER_ADMIN)
  async updateDeviceStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDeviceStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = req.user.sub || req.user.id;
    const correlationId =
      req.correlationId || (req.headers['x-correlation-id'] as string) || `cid-${Date.now()}`;
    const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    return this.devicesService.updateDeviceStatus(actorUserId, id, dto, correlationId, clientIp);
  }

  /**
   * Update device approved client version (FR-LAB-003, FR-CONF-001)
   */
  @Patch('admin/devices/:id/version')
  @Roles(UserRole.SUPER_ADMIN)
  async updateDeviceVersion(
    @Param('id') id: string,
    @Body() dto: UpdateDeviceVersionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = req.user.sub || req.user.id;
    const correlationId =
      req.correlationId || (req.headers['x-correlation-id'] as string) || `cid-${Date.now()}`;
    const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    return this.devicesService.updateApprovedVersion(actorUserId, id, dto, correlationId, clientIp);
  }

  /**
   * Ingest client lockdown security events into audit trail (FR-LAB-006, BR-015, SRS 11.4)
   */
  @Post('candidate/lockdown-events')
  @Roles(UserRole.CANDIDATE)
  @HttpCode(HttpStatus.CREATED)
  async recordLockdownEvent(@Body() dto: RecordLockdownEventDto, @Req() req: AuthenticatedRequest) {
    const candidateUserId = req.user.sub || req.user.id;
    const correlationId =
      req.correlationId || (req.headers['x-correlation-id'] as string) || `cid-${Date.now()}`;
    const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    return this.devicesService.recordLockdownEvent(candidateUserId, dto, correlationId, clientIp);
  }

  /**
   * Retrieve system operational policies (FR-CONF-004)
   */
  @Get('system/policies')
  @Public()
  async getSystemPolicies() {
    return this.devicesService.getSystemPolicies();
  }
}
