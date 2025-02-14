import { Injectable, Logger } from '@nestjs/common';
import { AppService } from '../app.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visibility } from './entity/visibility.entity';

@Injectable()
export class VisibilityService {
  private readonly logger: Logger = new Logger(AppService.name);

  constructor(
    @InjectRepository(Visibility)
    private visibilityRepository: Repository<Visibility>,
  ) {}

  public async getAllVisibilityStatuses(): Promise<Visibility[]> {
    const visibilityStatuses: Visibility[] =
      await this.visibilityRepository.find();
    if (!visibilityStatuses.length) {
      this.logger.error('Visibility statuses not found.');
      throw new Error('Visibility statuses not found.');
    }
    this.logger.log('Visibility statuses found.');
    return visibilityStatuses;
  }
}
