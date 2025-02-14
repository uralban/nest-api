import { Test, TestingModule } from '@nestjs/testing';
import { VisibilityController } from './visibility.controller';
import { VisibilityService } from './visibility.service';

describe('VisibilityController', () => {
  let controller: VisibilityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisibilityController],
      providers: [VisibilityService],
    }).compile();

    controller = module.get<VisibilityController>(VisibilityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
