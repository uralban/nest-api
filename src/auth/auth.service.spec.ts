import { User } from '../user/entities/user.entity';
import { Auth } from './entities/auth.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RedisService } from '../redis/redis.service';
import { LocalJwtService } from './local-jwt.service';
import { AuthService } from './auth.service';
import {
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let redisService: RedisService;
  let localJwtService: LocalJwtService;

  const mockRefreshTokenRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(Auth),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: RedisService,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: LocalJwtService,
          useValue: {
            signAccess: jest.fn(),
            signRefresh: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    redisService = module.get<RedisService>(RedisService);
    localJwtService = module.get<LocalJwtService>(LocalJwtService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveAccessToken', () => {
    it('should save access token in Redis', async () => {
      const userEmail = 'test@example.com';
      const accessToken = 'some-token-123';

      await service.saveAccessToken(userEmail, accessToken);
      expect(redisService.set).toHaveBeenCalledWith(
        `access_token:${userEmail}`,
        accessToken,
        900,
      );
      expect(redisService.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAccessToken', () => {
    it('should return access token from Redis', async () => {
      const userEmail = 'test@example.com';
      const accessToken = 'some-token-123';
      redisService.get = jest.fn().mockResolvedValue(accessToken);
      const result = await service.getAccessToken(userEmail);
      expect(result).toEqual(accessToken);
    });
  });

  describe('deleteAccessToken', () => {
    it('should delete token from Redis', async () => {
      const userEmail = 'test@example.com';
      await service.deleteAccessToken(userEmail);
      expect(redisService.del).toHaveBeenCalledWith(
        `access_token:${userEmail}`,
      );
      expect(redisService.del).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAuthDataByEmail', () => {
    it('should return Not Found exception', async () => {
      const userEmail = 'test@example.com';
      mockRefreshTokenRepository.findOne = jest.fn().mockResolvedValue(null);
      await expect(service['getAuthDataByEmail'](userEmail)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return Auth data', async () => {
      const userEmail = 'test@example.com';
      const mockAuth = {
        refreshToken: 'some-token-123',
        user: {
          emailLogin: userEmail,
        },
      } as Auth;
      mockRefreshTokenRepository.findOne = jest
        .fn()
        .mockResolvedValue(mockAuth);
      const result = await service['getAuthDataByEmail'](userEmail);
      expect(result).toEqual({
        refreshToken: 'some-token-123',
        user: {
          emailLogin: userEmail,
        },
      });
    });
  });

  describe('createNewUserByAuth0', () => {
    it('should create new user', async () => {
      const mockCreateUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        emailLogin: 'example@example.com',
        password: '',
      } as CreateUserDto;
      const mockNewUser = {
        emailLogin: 'example@example.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
      } as User;
      const savedUser = {
        id: '1',
        ...mockNewUser,
      } as User;
      mockUserRepository.create.mockReturnValue(mockNewUser);
      mockUserRepository.save.mockResolvedValue(savedUser);
      const result = await service['createNewUserByAuth0'](mockCreateUserDto);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        emailLogin: 'example@example.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockNewUser);
      expect(result).toEqual(savedUser);
    });

    it('should return undefined if saving user fails', async () => {
      const createUserDto: CreateUserDto = {
        emailLogin: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: '',
      };
      const newUser = {
        emailLogin: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
      };
      mockUserRepository.create.mockReturnValue(newUser);
      mockUserRepository.save.mockRejectedValue(new Error('Database error'));
      const result = await service['createNewUserByAuth0'](createUserDto);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        emailLogin: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(newUser);
      expect(result).toBeUndefined();
    });
  });

  describe('getUserByEmail', () => {
    it('should return User', async () => {
      const userEmail = 'test@example.com';
      const mockedUser = {
        emailLogin: userEmail,
        id: '1',
      };
      mockUserRepository.findOne = jest.fn().mockResolvedValue(mockedUser);
      const result = await service['getUserByEmail'](userEmail);
      expect(result).toEqual({
        emailLogin: userEmail,
        id: '1',
      });
    });

    it('should return Unauthorized exception', async () => {
      const userEmail = 'test@example.com';
      mockUserRepository.findOne = jest.fn().mockResolvedValue(null);
      await expect(service['getUserByEmail'](userEmail)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('saveRefreshToken', () => {
    const userEmail = 'test@example.com';
    const newRefreshToken = 'refresh-token';
    const refreshToken = 'updated-refresh-token';
    const mockedUser = {
      emailLogin: userEmail,
    } as User;
    const newAuth = {
      id: 'auth1',
      refreshToken,
      user: mockedUser,
    } as Auth;
    const existAuth = {
      id: 'auth1',
      refreshToken: 'some-token-123',
    } as Auth;

    it('should InternalServerErrorException if save refresh token filed', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);
      mockRefreshTokenRepository.create.mockReturnValue(newAuth);
      mockRefreshTokenRepository.save.mockRejectedValue(
        new Error('Save error'),
      );
      await expect(
        service.saveRefreshToken(userEmail, newRefreshToken, mockedUser),
      ).rejects.toThrow(
        new InternalServerErrorException('Failed to update refresh token.'),
      );
    });

    it('should update exist refresh token', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue(existAuth);
      mockUserRepository.findOne.mockReturnValue(null);
      mockRefreshTokenRepository.create.mockReturnValue(null);
      mockRefreshTokenRepository.save.mockResolvedValue({
        ...existAuth,
        refreshToken,
      });
      await service.saveRefreshToken(userEmail, refreshToken);
      expect(mockUserRepository.findOne).not.toHaveBeenCalled();
      expect(mockRefreshTokenRepository.create).not.toHaveBeenCalled();
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith({
        ...existAuth,
        refreshToken,
      });
    });

    it('should add new Auth with refresh token', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);
      mockUserRepository.findOne.mockResolvedValue(mockedUser);
      mockRefreshTokenRepository.create.mockReturnValue({
        id: 'auth1',
        refreshToken,
        user: mockedUser,
      });
      mockRefreshTokenRepository.save.mockResolvedValue(newAuth);
      await service.saveRefreshToken(userEmail, refreshToken);
      expect(mockRefreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { user: { emailLogin: userEmail } },
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { emailLogin: userEmail },
      });
      expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith({
        refreshToken,
        user: mockedUser,
      });
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith(newAuth);
    });
  });

  describe('updateRefreshToken', () => {
    it('should update existing refresh token', async () => {
      const userEmail = 'test@example.com';
      const refreshToken = 'refresh-token';
      const existAuth = {
        id: 'auth1',
        refreshToken: 'some-token-123',
      } as Auth;
      mockRefreshTokenRepository.findOne.mockResolvedValue(existAuth);
      mockRefreshTokenRepository.save.mockResolvedValue({
        ...existAuth,
        refreshToken,
      });
      await service.updateRefreshToken(userEmail, refreshToken);
      expect(mockUserRepository.findOne).not.toHaveBeenCalled();
      expect(mockRefreshTokenRepository.create).not.toHaveBeenCalled();
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith({
        ...existAuth,
        refreshToken,
      });
    });
  });

  describe('validateUser', () => {
    it('should compare password and hash and return UnauthorizedException if password incorrect', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password',
      } as LoginDto;
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(false));
      await expect(service.validateUser(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should compare password and hash and return tokens set', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password',
      } as LoginDto;
      const user = {
        emailLogin: 'test@example.com',
        passHash: 'passwordHash',
      } as User;
      mockUserRepository.findOne.mockResolvedValue(user);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));
      jest.spyOn(localJwtService, 'signAccess').mockReturnValue('accessToken');
      jest
        .spyOn(localJwtService, 'signRefresh')
        .mockReturnValue('refreshToken');
      jest.spyOn(service, 'saveAccessToken').mockResolvedValue(undefined);
      jest.spyOn(service, 'saveRefreshToken').mockResolvedValue(undefined);
      const result = await service.validateUser(loginDto);
      expect(result).toEqual({
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
      });
    });
  });

  describe('validateRefreshToken', () => {
    it('should match tokens', async () => {
      const userEmail = 'test@example.com';
      const refreshToken = 'refresh-token';
      const existAuth = {
        refreshToken: 'refresh-token',
      } as Auth;
      mockRefreshTokenRepository.findOne.mockResolvedValue(existAuth);
      const result = await service.validateRefreshToken(
        userEmail,
        refreshToken,
      );
      expect(result).toEqual(true);
    });

    it('should not match tokens', async () => {
      const userEmail = 'test@example.com';
      const refreshToken = 'refresh-not-match-token';
      const existAuth = {
        refreshToken: 'refresh-token',
      } as Auth;
      mockRefreshTokenRepository.findOne.mockResolvedValue(existAuth);
      const result = await service.validateRefreshToken(
        userEmail,
        refreshToken,
      );
      expect(result).toEqual(false);
    });
  });

  describe('validateAccessToken', () => {
    it('should match tokens', async () => {
      const userEmail = 'test@example.com';
      const accessToken = 'access-token';
      jest.spyOn(redisService, 'get').mockResolvedValue(accessToken);
      const result = await service.validateAccessToken(userEmail, accessToken);
      expect(result).toEqual(true);
    });

    it('should not match tokens', async () => {
      const userEmail = 'test@example.com';
      const accessToken = 'access-token';
      const accessNotMatchToken = 'access-not-match-token';
      jest.spyOn(redisService, 'get').mockResolvedValue(accessToken);
      const result = await service.validateAccessToken(
        userEmail,
        accessNotMatchToken,
      );
      expect(result).toEqual(false);
    });
  });

  describe('deleteRefreshToken', () => {
    it('should remove refresh token', async () => {
      const userEmail = 'test@example.com';
      const existAuth = {
        refreshToken: 'refresh-token',
      } as Auth;
      mockRefreshTokenRepository.findOne.mockResolvedValue(existAuth);
      mockRefreshTokenRepository.remove.mockResolvedValue(undefined);
      await service.deleteRefreshToken(userEmail);
      expect(mockRefreshTokenRepository.remove).toHaveBeenCalledWith(existAuth);
      expect(mockRefreshTokenRepository.remove).toHaveBeenCalledTimes(1);
    });

    it("should don't remove refresh token", async () => {
      const userEmail = 'test@example.com';
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);
      await service.deleteRefreshToken(userEmail);
      expect(mockRefreshTokenRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('getUserAfterLogin', () => {
    it('should found and return User', async () => {
      const userEmail = 'test@example.com';
      const givenName = 'given-name';
      const familyName = 'family-name';
      const user = {
        emailLogin: userEmail,
      } as User;
      mockUserRepository.findOne.mockResolvedValue(user);
      const result = await service.getUserAfterLogin(
        userEmail,
        givenName,
        familyName,
      );
      expect(result).toEqual(user);
    });

    it('should create and return User', async () => {
      const userEmail = 'test@example.com';
      const givenName = 'given-name';
      const familyName = 'family-name';
      const user = {
        emailLogin: userEmail,
        firstName: givenName,
        lastName: familyName,
      } as User;
      mockUserRepository.findOne.mockResolvedValue(null);
      jest
        .spyOn(service as any, 'createNewUserByAuth0')
        .mockResolvedValue(user);
      const result = await service.getUserAfterLogin(
        userEmail,
        givenName,
        familyName,
      );
      expect(result).toEqual(user);
    });
  });
});
