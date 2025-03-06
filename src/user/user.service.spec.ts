import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PaginationOptionsDto } from '../global/dto/pagination-options.dto';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Order } from '../global/enums/order.enum';
import { GetUsersByNameDto } from './dto/get-users-by-name.dto';
import * as uuid from 'uuid';

describe('UserService', () => {
  let service: UserService;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getCount: jest.fn(),
      getRawAndEntities: jest.fn(),
    })),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'AWS_REGION') return 'us-east-1';
      if (key === 'AWS_S3_BUCKET') return 'my-test-bucket';
      if (key === 'AWS_ACCESS_KEY_ID') return 'mock-key-id';
      if (key === 'AWS_SECRET_ACCESS_KEY') return 'mock-secret-key';
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);

    (service as any).s3 = {
      send: jest.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    const createUserDto = {
      firstName: 'John',
      lastName: 'Doe',
      emailLogin: 'example@example.com',
      password: 'password123',
    } as CreateUserDto;
    const newUser = {
      id: 'new-user-id',
    } as User;

    it('should return InternalServerErrorException if saving user is failed', async () => {
      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(() => Promise.resolve('hashedPassword'));
      mockUserRepository.create.mockResolvedValue(newUser);
      mockUserRepository.save.mockRejectedValue(new Error('save error'));
      await expect(service.createUser(newUser)).rejects.toThrow(
        new InternalServerErrorException('Error while saving user'),
      );
    });

    it('should be create new user', async () => {
      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(() => Promise.resolve('hashedPassword'));
      mockUserRepository.create.mockResolvedValue(newUser);
      mockUserRepository.save.mockResolvedValue(null);
      await service.createUser(createUserDto);
      expect(mockUserRepository.create).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        emailLogin: 'example@example.com',
        passHash: 'hashedPassword',
        avatarUrl: '',
      });
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateUserById', () => {
    const userEmail = 'test@email.com';
    const updateUserDto = {
      firstName: 'new-firstName',
      lastName: 'new-lastName',
      password: 'new-password',
    } as UpdateUserDto;
    const file = {
      filename: 'file.jpg',
    } as Express.Multer.File;
    const existUser = {
      id: 'user-id',
      avatarUrl: 'logo.png',
    } as User;

    it('should return InternalServerErrorException if saving user is failed', async () => {
      jest.spyOn(service, 'getUserByEmail').mockResolvedValue(existUser);
      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(() => Promise.resolve('hashedPassword'));
      mockUserRepository.save.mockRejectedValue(new Error('Save error'));
      await expect(
        service.updateUserById(userEmail, updateUserDto),
      ).rejects.toThrow(
        new InternalServerErrorException('Failed to update user.'),
      );
    });

    it('should return updated company when new file is not get', async () => {
      jest.spyOn(service, 'getUserByEmail').mockResolvedValue(existUser);
      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(() => Promise.resolve('hashedPassword'));
      jest.spyOn(service as any, 'uploadFileToS3').mockReset();
      const { password, ...otherData } = updateUserDto;
      mockUserRepository.save.mockResolvedValue({
        ...existUser,
        ...otherData,
      });
      const result = await service.updateUserById(userEmail, updateUserDto);
      expect(service['uploadFileToS3']).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 'user-id',
        avatarUrl: 'logo.png',
        firstName: 'new-firstName',
        lastName: 'new-lastName',
        passHash: 'hashedPassword',
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith({
        id: 'user-id',
        firstName: 'new-firstName',
        lastName: 'new-lastName',
        passHash: 'hashedPassword',
        avatarUrl: 'logo.png',
      });
    });

    it('should return updated user when new file is get', async () => {
      jest.spyOn(service, 'getUserByEmail').mockResolvedValue(existUser);
      jest
        .spyOn(service as any, 'uploadFileToS3')
        .mockResolvedValue('new-logo.png');
      jest.spyOn(bcrypt as any, 'hash').mockResolvedValue('hashedPassword');
      const { password, ...otherData } = updateUserDto;
      mockUserRepository.save.mockResolvedValue({
        ...existUser,
        ...otherData,
        avatarUrl: 'new-logo.png',
      });
      const result = await service.updateUserById(
        userEmail,
        updateUserDto,
        file,
      );
      expect(result).toEqual({
        id: 'user-id',
        firstName: 'new-firstName',
        lastName: 'new-lastName',
        passHash: 'hashedPassword',
        avatarUrl: 'new-logo.png',
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith({
        id: 'user-id',
        firstName: 'new-firstName',
        lastName: 'new-lastName',
        passHash: 'hashedPassword',
        avatarUrl: 'new-logo.png',
      });
    });
  });

  describe('removeUser', () => {
    const userEmail = 'test@email.com';
    const existUser = {
      id: 'user-id',
    } as User;

    it('should return InternalServerErrorException if removeUser executing filed', async () => {
      jest.spyOn(service, 'getUserByEmail').mockResolvedValue(existUser);
      mockUserRepository.remove.mockRejectedValue(new Error('remove failed'));
      await expect(service.removeUser(userEmail)).rejects.toThrow(
        new InternalServerErrorException('Failed to remove user.'),
      );
    });

    it('should remove an existing user and return ResultMessage', async () => {
      jest.spyOn(service, 'getUserByEmail').mockResolvedValue(existUser);
      mockUserRepository.remove.mockResolvedValue(null);
      const result = await service.removeUser(userEmail);
      expect(result).toEqual({
        message: `The user was successfully deleted.`,
      });
      expect(mockUserRepository.remove).toHaveBeenCalledWith(existUser);
    });
  });

  describe('getAllUsers', () => {
    it('should return paginated users list', async () => {
      const pageOptionsDto = {
        order: Order.ASC,
        page: 1,
        take: 3,
      } as PaginationOptionsDto;
      const existUser = {
        id: 'user-id',
      } as User;
      mockUserRepository.createQueryBuilder.mockReturnValue({
        getMany: undefined,
        limit: undefined,
        select: undefined,
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getRawAndEntities: jest.fn().mockResolvedValue({
          entities: [existUser],
        }),
      });
      const result = await service.getAllUsers(pageOptionsDto);
      expect(result).toEqual({
        data: [existUser],
        meta: {
          page: pageOptionsDto.page,
          take: pageOptionsDto.take,
          itemCount: 1,
          pageCount: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      });
    });
  });

  describe('getUserById', () => {
    const userId = 'user-id';
    const existUser = {
      id: userId,
    } as User;

    it('should return NotFoundException if user does not exist', async () => {
      mockUserRepository.findOne.mockReturnValue(null);
      await expect(service.getUserById(userId)).rejects.toThrow(
        new NotFoundException(`User with ID ${userId} not found.`),
      );
    });

    it('should return user by ID', async () => {
      mockUserRepository.findOne.mockReturnValue(existUser);
      const result = await service.getUserById(userId);
      expect(result).toEqual(existUser);
    });
  });

  describe('getUserByEmail', () => {
    const userEmail = 'email@gmail.com';
    const existUser = {
      id: 'user-id',
    } as User;

    it('should return NotFoundException if user by email does not exist', async () => {
      mockUserRepository.findOne.mockReturnValue(null);
      await expect(service.getUserByEmail(userEmail)).rejects.toThrow(
        new NotFoundException(`User with email ${userEmail} not found.`),
      );
    });

    it('should return user by email', async () => {
      mockUserRepository.findOne.mockReturnValue(existUser);
      const result = await service.getUserByEmail(userEmail);
      expect(result).toEqual(existUser);
    });
  });

  describe('getCheckEmailExist', () => {
    const userEmail = 'email@gmail.com';
    const existUser = {
      id: 'user-id',
    } as User;

    it('should return emailNotExist if user does not exist', async () => {
      mockUserRepository.findOne.mockReturnValue(null);
      const result = await service.getCheckEmailExist(userEmail);
      expect(result).toEqual('emailNotExist');
    });

    it('should return user by email', async () => {
      mockUserRepository.findOne.mockReturnValue(existUser);
      const result = await service.getUserByEmail(userEmail);
      expect(result).toEqual(existUser);
    });
  });

  describe('getUsersByName', () => {
    const getUsersByNameDto = {
      name: 'user-name',
    } as GetUsersByNameDto;
    const existUsers = [{ id: 'user-id' }] as User[];

    it('should return users list', async () => {
      mockUserRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: undefined,
        skip: undefined,
        take: undefined,
        limit: jest.fn().mockReturnThis(),
        getRawAndEntities: undefined,
        getCount: undefined,
        getMany: jest.fn().mockReturnValue(existUsers),
      });
      const result = await service.getUsersByName(getUsersByNameDto);
      expect(result).toEqual(existUsers);
    });
  });

  describe('uploadFileToS3', () => {
    it('should upload file to S3 and return the URL', async () => {
      const file = {
        originalname: 'test-logo.png',
        buffer: Buffer.from('test data'),
        mimetype: 'image/png',
        size: 123,
        fieldname: 'file',
        encoding: '7bit',
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      } as Express.Multer.File;
      const mockUuid = 'mock-uuid-123';
      const bucketName = 'my-test-bucket';
      const region = 'us-east-1';
      const expectedUrl = `https://${bucketName}.s3.${region}.amazonaws.com/avatars/${mockUuid}-${file.originalname}`;
      jest.spyOn(uuid as any, 'v4').mockReturnValue(mockUuid);

      const result = await (service as any).uploadFileToS3(file);

      expect(uuid.v4).toHaveBeenCalled();
      expect(mockConfigService.get).toHaveBeenCalledWith('AWS_REGION');
      expect(mockConfigService.get).toHaveBeenCalledWith('AWS_S3_BUCKET');
      expect((service as any).s3.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: bucketName,
            Key: `avatars/${mockUuid}-${file.originalname}`,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read',
          }),
        }),
      );
      expect(result).toBe(expectedUrl);
    });

    it('should handle S3 upload error gracefully', async () => {
      const file: Express.Multer.File = {
        originalname: 'test-logo.png',
        buffer: Buffer.from('test data'),
        mimetype: 'image/png',
        size: 123,
        fieldname: 'file',
        encoding: '7bit',
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };
      const mockUuid = 'mock-uuid-123';
      jest.spyOn(uuid as any, 'v4').mockReturnValue(mockUuid);
      (service as any).s3.send.mockRejectedValue(new Error('S3 upload failed'));

      await expect((service as any).uploadFileToS3(file)).rejects.toThrow(
        'S3 upload failed',
      );
      expect((service as any).s3.send).toHaveBeenCalled();
    });
  });
});
