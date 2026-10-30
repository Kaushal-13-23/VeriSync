import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { EvaluationModule } from '../evaluation/evaluation.module';

@Module({
  imports: [AuditModule, EvaluationModule],
  controllers: [ResultsController],
  providers: [ResultsService, PrismaService],
  exports: [ResultsService],
})
export class ResultsModule {}
