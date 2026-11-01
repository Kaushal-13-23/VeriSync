import { Module } from '@nestjs/common';
import { SqlSandboxService } from './sql-sandbox.service';

@Module({
  providers: [SqlSandboxService],
  exports: [SqlSandboxService],
})
export class SqlModule {}
