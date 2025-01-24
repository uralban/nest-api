import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { NotFoundException } from '@nestjs/common';
import { DeleteResultMessage } from '../global/interfaces/delete-result-message';
import { PaginationOptionsDto } from '../global/dto/pagination-options.dto';
import { PaginationDto } from '../global/dto/pagination.dto';
import { Order } from '../global/enums/order.enum';

describe('UserController', () => {
  let userController: UserController;
  let userService: UserService;

  const mockUserService = {
    createUser: jest.fn(),
    getAllUsers: jest.fn(),
    getUserById: jest.fn(),
    updateUserById: jest.fn(),
    removeUserById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    userController = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(userController).toBeDefined();
  });

  describe('createUser', () => {
    it('should call userService.createUser and return the created user', async () => {
      const createUserDto: CreateUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        emailLogin: 'example@gmail.com',
        password: 'test',
      };
      const mockUuid = 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d';
      const mockRole: Role = {
        id: 'role-id',
        roleName: 'user',
        updatedAt: new Date(),
        createdAt: new Date(),
      };
      const result: User = {
        id: mockUuid,
        firstName: 'John',
        lastName: 'Doe',
        emailLogin: 'example@gmail.com',
        passHash: 'hashedpassword',
        token: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        role: mockRole,
      };
      mockUserService.createUser.mockResolvedValue(result);

      expect(await userController.createUser(createUserDto)).toEqual(result);
      expect(mockUserService.createUser).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('updateUserById', () => {
    it('should call userService.updateUserById and return the updated user', async () => {
      const updateUserDto: UpdateUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        emailLogin: 'example@gmail.com',
        password: 'test',
      };
      const mockUuid = 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d';
      const mockRole: Role = {
        id: 'role-id',
        roleName: 'user',
        updatedAt: new Date(),
        createdAt: new Date(),
      };
      const result: User = {
        id: mockUuid,
        firstName: 'John',
        lastName: 'Doe',
        emailLogin: 'example@gmail.com',
        passHash: 'hashedpassword',
        token: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        role: mockRole,
      };
      mockUserService.updateUserById.mockResolvedValue(result);

      expect(
        await userController.updateUserById(mockUuid, updateUserDto),
      ).toEqual(result);
      expect(mockUserService.updateUserById).toHaveBeenCalledWith(
        mockUuid,
        updateUserDto,
      );
    });

    it('should throw NotFoundException if the user does not exist', async () => {
      const userId = 'non-existent-id';
      const updateUserDto: UpdateUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        emailLogin: 'example@gmail.com',
      };
      mockUserService.updateUserById.mockRejectedValue(
        new NotFoundException(`User with ID ${userId} not found.`),
      );

      await expect(
        userController.updateUserById(userId, updateUserDto),
      ).rejects.toThrow(NotFoundException);
      expect(mockUserService.updateUserById).toHaveBeenCalledWith(
        userId,
        updateUserDto,
      );
    });
  });

  describe('deleteUser', () => {
    it('should return a success message when user is deleted', async () => {
      const userId = 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d';
      const mockDeleteResult: DeleteResultMessage = {
        message: `User with ID ${userId} successfully deleted.`,
        deletedId: userId,
      };
      mockUserService.removeUserById.mockResolvedValue(mockDeleteResult);

      expect(await userController.removeUserById(userId)).toEqual(
        mockDeleteResult,
      );
      expect(mockUserService.removeUserById).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException when user is not found', async () => {
      const userId = 'non-existent-id';
      mockUserService.removeUserById.mockRejectedValue(
        new NotFoundException(`User with ID ${userId} not found.`),
      );

      await expect(userController.removeUserById(userId)).rejects.toThrow(
        new NotFoundException(`User with ID ${userId} not found.`),
      );

      expect(mockUserService.removeUserById).toHaveBeenCalledWith(userId);
    });
  });

  describe('gatAllUsers', () => {
    it('should return a list of users with pagination', async () => {
      const mockUuid = 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d';
      const mockRole: Role = {
        id: 'role-id',
        roleName: 'user',
        updatedAt: new Date(),
        createdAt: new Date(),
      };
      const mockUsers: User[] = [
        {
          id: mockUuid,
          firstName: 'John',
          lastName: 'Doe',
          emailLogin: 'example@gmail.com',
          passHash: 'hashedpassword',
          token: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          role: mockRole,
        },
      ];
      const mockPageDto: PaginationDto<User> = new PaginationDto(mockUsers, {
        page: 1,
        take: 1,
        itemCount: 1,
        pageCount: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
      mockUserService.getAllUsers.mockResolvedValue(mockPageDto);
      const pageOptionsDto: PaginationOptionsDto = {
        page: 1,
        take: 10,
        order: Order.ASC,
        skip: 0,
      };

      expect(await userController.getAllUsers(pageOptionsDto)).toEqual(
        mockPageDto,
      );
      expect(userService.getAllUsers).toHaveBeenCalledWith(pageOptionsDto);
      expect(userService.getAllUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe('gatUserById', () => {
    it('should return user by id', async () => {
      const mockUuid = 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d';
      const mockRole: Role = {
        id: 'role-id',
        roleName: 'user',
        updatedAt: new Date(),
        createdAt: new Date(),
      };
      const result: User = {
        id: mockUuid,
        firstName: 'John',
        lastName: 'Doe',
        emailLogin: 'example@gmail.com',
        passHash: 'hashedpassword',
        token: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        role: mockRole,
      };
      mockUserService.getUserById.mockResolvedValue(result);

      expect(await userController.getUserById(mockUuid)).toEqual(result);
      expect(mockUserService.getUserById).toHaveBeenCalledWith(mockUuid);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const userId = 'non-existent-id';

      mockUserService.getUserById.mockRejectedValue(
        new NotFoundException(`User with ID ${userId} not found.`),
      );

      await expect(userController.getUserById(userId)).rejects.toThrow(
        new NotFoundException(`User with ID ${userId} not found.`),
      );
      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
    });
  });
});
