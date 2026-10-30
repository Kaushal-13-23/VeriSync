import { Module } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [EvaluationController],
  providers: [EvaluationService, PrismaService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
