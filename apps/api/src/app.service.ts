import { Injectable } from '@nestjs/common';
import { HealthStatusResponse } from '@verisync/shared';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello from VeriSync API (Phase 0 Scaffold)';
  }

  getHealth(): HealthStatusResponse {
    return {
      status: 'ok',
      serverTime: new Date().toISOString(), // UTC ISO-8601 per Rule 9
      version: '1.1.0',
    };
  }
}
