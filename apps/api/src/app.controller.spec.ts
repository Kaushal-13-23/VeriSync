import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root endpoint', () => {
    it('should return hello world message', () => {
      expect(appController.getHello()).toContain('Hello from VeriSync API');
    });
  });

  describe('health endpoint', () => {
    it('should return health status ok with ISO-8601 UTC timestamp', () => {
      const health = appController.getHealth();
      expect(health.status).toBe('ok');
      expect(health.version).toBe('1.1.0');
      expect(new Date(health.serverTime).toISOString()).toBe(health.serverTime);
    });
  });
});
