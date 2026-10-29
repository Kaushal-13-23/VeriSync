import { Module } from '@nestjs/common';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { CandidatePortalController } from './candidate-portal.controller';
import { CandidatePortalService } from './candidate-portal.service';
import { PrismaService } from '../common/prisma.service';
import { PasswordService } from '../auth/password.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [CandidatesController, CandidatePortalController],
  providers: [CandidatesService, CandidatePortalService, PrismaService, PasswordService],
  exports: [CandidatesService, CandidatePortalService],
})
export class CandidatesModule {}
