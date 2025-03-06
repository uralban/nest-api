import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { NotificationService } from './notification.service';
import { Server, Socket } from 'socket.io';
import { ApiTags } from '@nestjs/swagger';
import { Logger, UseGuards } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './entities/notification.entity';
import { WsAuthGuard } from './ws-auth.guard';

@ApiTags('Notifications websocket')
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ALLOWED_ORIGINS,
    methods: process.env.CORS_ALLOWED_METHODS,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@UseGuards(WsAuthGuard)
export class NotificationGateway {
  private readonly logger: Logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server: Server;

  private activeUsers: Map<string, string> = new Map<string, string>();

  constructor(private readonly notificationService: NotificationService) {}

  public handleConnection(client: Socket): void {
    const userId: string = client.handshake.query.userId as string;
    if (userId) {
      this.activeUsers.set(userId, client.id);
      this.logger.log(`User ${userId} connected with socket ID: ${client.id}`);
    }
  }

  public handleDisconnect(client: Socket): void {
    const userId: string = [...this.activeUsers.entries()].find(
      ([, id]): boolean => id === client.id,
    )?.[0];
    if (userId) {
      this.activeUsers.delete(userId);
      this.logger.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('subscribeNotifications')
  public handleSubscribe(
    @MessageBody() userId: string,
    @ConnectedSocket() client: Socket,
  ): void {
    this.activeUsers.set(userId, client.id);
    this.logger.log(`User ${userId} subscribed with socket ${client.id}`);
  }

  public async sendNotificationToUser(
    userId: string,
    notification: CreateNotificationDto,
    companyId: string | undefined,
  ): Promise<void> {
    let newNotification: Notification;
    try {
      newNotification = await this.notificationService.createNotification(
        userId,
        notification,
        companyId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create notification for user ${userId}`,
        error.stack,
      );
      return;
    }
    const socketId: string = this.activeUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification', newNotification);
      this.logger.log(`Notification sent to user ${userId}.`);
    }
  }
}
