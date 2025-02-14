import { Test, TestingModule } from '@nestjs/testing';
import { VisibilityService } from './visibility.service';

describe('VisibilityService', () => {
  let service: VisibilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VisibilityService],
    }).compile();

    service = module.get<VisibilityService>(VisibilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
