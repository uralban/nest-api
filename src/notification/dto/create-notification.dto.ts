import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Notification message', example: 'New message' })
  @Type(() => String)
  @IsString({ message: 'Message should be a string' })
  @IsNotEmpty({ message: 'Message should not be empty' })
  message: string;
}
