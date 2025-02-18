import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class ParseJsonPipeWithValidation<T extends object>
  implements PipeTransform<string, Promise<T>>
{
  constructor(private readonly dto: new () => T) {}

  async transform(value: string): Promise<T> {
    let parsed: T;
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      throw new BadRequestException('Wrong JSON ', error.message);
    }

    const object: T = plainToInstance(this.dto, parsed);

    const errors = await validate(object);
    if (errors.length > 0) {
      throw new BadRequestException(
        'Validation error: ' + JSON.stringify(errors),
      );
    }

    return object;
  }
}
