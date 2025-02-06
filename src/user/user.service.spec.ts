import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { Role } from '../role/entities/role.entity';
import { CreateUserDto } from '../global/dto/user/create-user.dto';
import { UpdateUserDto } from '../global/dto/user/update-user.dto';
import { DeleteResultMessage } from '../global/interfaces/delete-result-message';
import { NotFoundException } from '@nestjs/common';
import { PaginationOptionsDto } from '../global/dto/pagination-options.dto';
import { PaginationMetaDto } from '../global/dto/pagination-meta.dto';
import { PaginationDto } from '../global/dto/pagination.dto';

describe('UserService', () => {
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
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(userService).toBeDefined();
  });

  describe('createUser', () => {
    it('should be create new user', async () => {
      const mockUuid: string = 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d';
      const createUserDto: CreateUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        emailLogin: 'example@example.com',
        password: 'password123',
      };
      const mockRole: Role = {
        id: mockUuid,
        roleName: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockUser: User = {
        id: mockUuid,
        firstName: 'John',
        lastName: 'Doe',
        emailLogin: 'example@example.com',
        passHash: 'hashedPassword123',
        createdAt: new Date(),
        updatedAt: new Date(),
        role: mockRole,
      };
      mockUserService.createUser.mockResolvedValue(mockUser);
      expect(await userService.createUser(createUserDto)).toEqual(mockUser);
    });
  });

  describe('updateUserById', () => {
    it('should return the updated user by ID', async () => {
      const mockUuid: string = 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d';
      const updateUserDto: UpdateUserDto = {
        firstName: 'Mike',
        lastName: 'Walker',
        emailLogin: 'example@gmail.com',
      };
      const mockRole: Role = {
        id: mockUuid,
        roleName: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockUser: User = {
        id: mockUuid,
        firstName: 'Mike',
        lastName: 'Walker',
        emailLogin: 'example@gmail.com',
        passHash: 'hashedPassword123',
        createdAt: new Date(),
        updatedAt: new Date(),
        role: mockRole,
      };
      mockUserService.updateUserById.mockResolvedValue(mockUser);
      expect(await userService.updateUserById(mockUuid, updateUserDto)).toEqual(
        mockUser,
      );
      expect(mockUserService.updateUserById).toHaveBeenCalledWith(
        mockUuid,
        updateUserDto,
      );
    });
  });

  describe('removeUserById', () => {
    it('should remove user by ID', async () => {
      const mockUuid: string = 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d';
      const result: DeleteResultMessage = {
        message: `User with ID ${mockUuid} successfully deleted.`,
        deletedId: mockUuid,
      };
      mockUserService.removeUserById.mockResolvedValue(result);
      expect(await userService.removeUserById(mockUuid)).toEqual(result);
      expect(mockUserService.removeUserById).toHaveBeenCalledWith(mockUuid);
    });
  });

  describe('getAllUsers', () => {
    it('should return all users with pagination', async () => {
      const paginationOptionsDto: PaginationOptionsDto = {
        page: 1,
        take: 1,
        skip: 0,
      };
      const mockUuid: string = 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d';
      const mockRole: Role = {
        id: mockUuid,
        roleName: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockUsers: User[] = [
        {
          id: mockUuid,
          firstName: 'Mike',
          lastName: 'Walker',
          emailLogin: 'example@gmail.com',
          passHash: 'hashedPassword123',
          createdAt: new Date(),
          updatedAt: new Date(),
          role: mockRole,
        },
      ];
      const mockMeta: PaginationMetaDto = {
        page: 1,
        take: 1,
        itemCount: 1,
        pageCount: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      };
      const mockPaginationDto: PaginationDto<User> = {
        data: mockUsers,
        meta: mockMeta,
      };
      mockUserService.getAllUsers.mockResolvedValue(mockPaginationDto);
      const result: PaginationDto<User> =
        await userService.getAllUsers(paginationOptionsDto);
      expect(result.data).toEqual(mockUsers);
      expect(result.meta).toEqual(mockMeta);
      expect(mockUserService.getAllUsers).toHaveBeenCalledWith(
        paginationOptionsDto,
      );
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const mockUuid: string = 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d';
      const mockRole: Role = {
        id: mockUuid,
        roleName: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockUser: User = {
        id: mockUuid,
        firstName: 'Mike',
        lastName: 'Walker',
        emailLogin: 'example@gmail.com',
        passHash: 'hashedPassword123',
        createdAt: new Date(),
        updatedAt: new Date(),
        role: mockRole,
      };
      mockUserService.getUserById.mockResolvedValue(mockUser);
      expect(await userService.getUserById(mockUuid)).toEqual(mockUser);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const userId: string = 'non-existent-id';
      mockUserService.getUserById.mockRejectedValue(
        new NotFoundException(`User with ID ${userId} not found.`),
      );
      await expect(userService.getUserById(userId)).rejects.toThrow(
        new NotFoundException(`User with ID ${userId} not found.`),
      );
      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
    });
  });
});
