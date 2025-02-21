import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { NotificationService } from './notification.service';
import { Server, Socket } from 'socket.io';
import { ApiTags } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';

@ApiTags('Notifications websocket')
@WebSocketGateway({ cors: true })
export class NotificationGateway {
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server: Server;

  private activeUsers = new Map<string, string>();

  constructor(private readonly notificationService: NotificationService) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.activeUsers.set(userId, client.id);
      this.logger.log(`User ${userId} connected with socket ID: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = [...this.activeUsers.entries()].find(
      ([, id]) => id === client.id,
    )?.[0];
    if (userId) {
      this.activeUsers.delete(userId);
      this.logger.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('subscribeNotifications')
  handleSubscribe(
    @MessageBody() userId: string,
    @ConnectedSocket() client: Socket,
  ): void {
    this.activeUsers.set(userId, client.id);
    this.logger.log(`User ${userId} subscribed with socket ${client.id}`);
  }

  public async sendNotificationToUser(
    userId: string,
    companyId: string,
    notification: CreateNotificationDto,
  ): Promise<void> {
    const socketId = this.activeUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification', notification.message);
      this.logger.log(`Notification sent to user ${userId}.`);
    }
    await this.notificationService.createNotification(
      userId,
      notification,
      companyId,
    );
  }
}
