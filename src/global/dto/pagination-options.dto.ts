import { ApiPropertyOptional } from '@nestjs/swagger';
import { Order } from '../enums/order.enum';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationOptionsDto {
  @ApiPropertyOptional({ enum: Order, default: Order.ASC })
  @IsOptional()
  @Type(() => String)
  @IsString({ message: 'Order should be a string' })
  readonly order?: Order = Order.ASC;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page count should be a number' })
  readonly page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Take count should be a number' })
  readonly take?: number = 10;

  get skip(): number {
    return (+this.page - 1) * this.take;
  }
}
