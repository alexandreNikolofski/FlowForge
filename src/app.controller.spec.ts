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

  describe('health', () => {
    it('should return application health data', () => {
      const health = appController.getHealth();

      expect(health).toMatchObject({
        status: 'ok',
        service: 'flow-forge',
      });
      expect(health.timestamp).toBeDefined();
    });
  });
});
