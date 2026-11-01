import { Module } from '@nestjs/common';
import { CodingController } from './coding.controller';
import { CodingService } from './coding.service';
import { CodeRunnerClient } from './code-runner.client';
import { SqlModule } from '../sql/sql.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [SqlModule, AuditModule],
  controllers: [CodingController],
  providers: [CodingService, CodeRunnerClient],
  exports: [CodingService, CodeRunnerClient],
})
export class CodingModule {}
