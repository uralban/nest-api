import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { NotificationService } from './notification.service';
import { GetUserEmail } from '../global/decorators/get-user-email.decorator';
import { Notification } from './entities/notification.entity';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({
    summary: 'Get user notifications',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns list of notifications',
    type: [Notification],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  public async getUserNotifications(
    @GetUserEmail() email: string,
  ): Promise<Notification[]> {
    return this.notificationService.getUserNotifications(email);
  }

  @Patch(':notificationId/read')
  @ApiOperation({
    summary: 'Mark notification as read',
  })
  @ApiParam({
    name: 'notificationId',
    description: 'The ID of the notification to mark as read.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification marked as read',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  public async markNotificationAsRead(
    @Param('notificationId') notificationId: string,
  ): Promise<void> {
    return this.notificationService.markNotificationAsRead(notificationId);
  }
}
