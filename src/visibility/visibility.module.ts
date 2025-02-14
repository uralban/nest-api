import { Module } from '@nestjs/common';
import { VisibilityService } from './visibility.service';
import { VisibilityController } from './visibility.controller';

@Module({
  controllers: [VisibilityController],
  providers: [VisibilityService],
})
export class VisibilityModule {}
