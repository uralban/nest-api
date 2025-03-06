import { Test, TestingModule } from '@nestjs/testing';
import { RoleService } from './role.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Member } from '../members/entities/member.entity';
import { Role } from './entities/role.entity';
import { NotFoundException } from '@nestjs/common';

describe('RoleService', () => {
  let service: RoleService;

  const mockRoleRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getExists: jest.fn(),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllRoles', () => {
    const existRoles = [{ id: 'role-id' }] as Role[];

    it('should return NotFoundException if roles not found', async () => {
      mockRoleRepository.find.mockResolvedValue([]);
      await expect(service.getAllRoles()).rejects.toThrow(
        new NotFoundException('Roles not found.'),
      );
    });

    it('should return roles list', async () => {
      mockRoleRepository.find.mockResolvedValue(existRoles);
      const result = await service.getAllRoles();
      expect(result).toEqual(existRoles);
    });
  });

  describe('getRoleById', () => {
    const rolId = 'role-id';
    const existRole = { id: 'role-id' } as Role;

    it('should return NotFoundException if role not found', async () => {
      mockRoleRepository.findOne.mockResolvedValue(null);
      await expect(service.getRoleById(rolId)).rejects.toThrow(
        new NotFoundException('Roles not found.'),
      );
    });

    it('should return roles list', async () => {
      mockRoleRepository.findOne.mockResolvedValue(existRole);
      const result = await service.getRoleById(rolId);
      expect(result).toEqual(existRole);
    });
  });

  describe('checkUserRole', () => {
    const userEmail = 'user@email.com';
    const companyId = 'company-id';
    const roleList = ['member'];

    it('should check role and return boolean', async () => {
      mockRoleRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getExists: jest.fn().mockReturnValue(true),
      });
      const result = await service.checkUserRole(
        userEmail,
        companyId,
        roleList,
      );
      expect(result).toEqual(true);
    });
  });
});
