import { Test, TestingModule } from '@nestjs/testing';
import { NotificationGateway } from './notification.gateway';
import { NotificationService } from './notification.service';
import { Server, Socket } from 'socket.io';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './entities/notification.entity';
import { AuthService } from '../auth/auth.service';
import { LocalJwtService } from '../auth/local-jwt.service';
import { RedisService } from '../redis/redis.service';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';

describe('NotificationGateway', () => {
  let module: TestingModule;

  const mockNotificationService = {
    createNotification: jest.fn(),
  };

  const mockAuthService = {
    validateUser: jest.fn(),
  };

  const mockLocalJwtService = {
    signAccess: jest.fn(),
    signRefresh: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockUserService = {
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'CORS_ALLOWED_ORIGINS') return '*';
      if (key === 'CORS_ALLOWED_METHODS') return 'GET,POST';
      return undefined;
    }),
  };

  const mockServer: Partial<Server> = {
    to: jest.fn(),
    emit: jest.fn(),
  };

  const mockSocket: Partial<Socket> = {
    id: 'socket-id',
    handshake: {
      query: { userId: 'user-id' },
    },
  } as any;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        NotificationGateway,
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: LocalJwtService,
          useValue: mockLocalJwtService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const createGateway = (): NotificationGateway => {
    const gateway = module.get<NotificationGateway>(NotificationGateway);
    gateway.server = mockServer as Server;
    gateway['activeUsers'] = new Map<string, string>();
    return gateway;
  };

  it('should be defined', () => {
    const gateway = createGateway();
    expect(gateway).toBeDefined();
    expect(gateway.server).toBeDefined();
  });

  describe('sendNotificationToUser', () => {
    const userId = 'user-id';
    const notificationDto = {
      message: 'Test notification',
    } as CreateNotificationDto;
    const companyId = 'company-id';
    const notification = {
      id: 'notif-id',
      text: 'Test notification',
      user: { id: userId },
      company: { id: companyId },
    } as Notification;

    it('should send notification to active user', async () => {
      const gateway = createGateway();
      gateway['activeUsers'].set(userId, 'socket-id');
      mockNotificationService.createNotification.mockResolvedValue(
        notification,
      );
      jest.spyOn(mockServer as any, 'to').mockReturnValue(mockServer);
      await gateway.sendNotificationToUser(userId, notificationDto, companyId);
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        userId,
        notificationDto,
        companyId,
      );
      expect(mockServer.to).toHaveBeenCalledWith('socket-id');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'notification',
        notification,
      );
    });

    it('should not send notification if user is not active', async () => {
      const gateway = createGateway();
      mockNotificationService.createNotification.mockResolvedValue(
        notification,
      );
      await gateway.sendNotificationToUser(userId, notificationDto, companyId);
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        userId,
        notificationDto,
        companyId,
      );
      expect(mockServer.to).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should handle error from createNotification gracefully', async () => {
      const gateway = createGateway();
      gateway['activeUsers'].set(userId, 'socket-id');
      mockNotificationService.createNotification.mockRejectedValue(
        new Error('Notification creation failed'),
      );
      await expect(
        gateway.sendNotificationToUser(userId, notificationDto, companyId),
      ).resolves.toBeUndefined();
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        userId,
        notificationDto,
        companyId,
      );
      expect(mockServer.to).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  describe('handleConnection', () => {
    it('should register user on connection with userId', () => {
      const gateway = createGateway();
      gateway.handleConnection(mockSocket as Socket);
      expect(gateway['activeUsers'].get('user-id')).toBe('socket-id');
    });

    it('should not register user if no userId provided', () => {
      const gateway = createGateway();
      const socketWithoutUserId = { ...mockSocket, handshake: { query: {} } };
      gateway.handleConnection(socketWithoutUserId as Socket);
      expect(gateway['activeUsers'].size).toBe(0);
    });
  });

  describe('handleDisconnect', () => {
    it('should remove user on disconnect', () => {
      const gateway = createGateway();
      gateway['activeUsers'].set('user-id', 'socket-id');
      gateway.handleDisconnect(mockSocket as Socket);
      expect(gateway['activeUsers'].has('user-id')).toBe(false);
    });

    it('should do nothing if socket not associated with user', () => {
      const gateway = createGateway();
      gateway.handleDisconnect(mockSocket as Socket);
      expect(gateway['activeUsers'].size).toBe(0);
    });
  });

  describe('handleSubscribe', () => {
    it('should subscribe user to notifications', () => {
      const gateway = createGateway();
      gateway.handleSubscribe('user-id', mockSocket as Socket);
      expect(gateway['activeUsers'].get('user-id')).toBe('socket-id');
    });
  });
});
