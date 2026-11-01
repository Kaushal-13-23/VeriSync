import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaService } from '../common/prisma.service';

import { AuditController } from './audit.controller';

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, PrismaService],
  exports: [AuditService],
})
export class AuditModule {}
