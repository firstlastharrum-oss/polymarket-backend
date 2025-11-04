import { Test, TestingModule } from '@nestjs/testing';
import { NotifictionController } from './notifiction.controller';

describe('NotifictionController', () => {
  let controller: NotifictionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotifictionController],
    }).compile();

    controller = module.get<NotifictionController>(NotifictionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
