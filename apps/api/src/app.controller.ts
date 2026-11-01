import { Controller, Get, Header } from '@nestjs/common';
import { AppService } from './app.service';
import { HealthStatusResponse } from '@verisync/shared';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  async getHealth(): Promise<HealthStatusResponse> {
    return this.appService.getHealth();
  }

  @Public()
  @Get('health/ready')
  async getReadiness(): Promise<HealthStatusResponse> {
    return this.appService.getReadiness();
  }

  @Public()
  @Get('health/live')
  getLiveness(): HealthStatusResponse {
    return this.appService.getLiveness();
  }

  @Public()
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    return this.appService.getPrometheusMetrics();
  }
}
