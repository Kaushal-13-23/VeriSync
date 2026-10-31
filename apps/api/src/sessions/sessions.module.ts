import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionExpiryWorker } from './session-expiry.worker';
import { PrismaService } from '../common/prisma.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [SessionsController],
  providers: [SessionsService, SessionExpiryWorker, PrismaService],
  exports: [SessionsService, SessionExpiryWorker],
})
export class SessionsModule {}
