import { Test, TestingModule } from '@nestjs/testing';
import { MemberService } from './member.service';
import { RoleService } from '../role/role.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Member } from './entities/member.entity';
import { Role } from '../role/entities/role.entity';
import { UpdateMemberRoleDto } from './dto/update-member.dto';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

describe('MembersService', () => {
  let service: MemberService;
  let roleService: RoleService;

  const mockMemberRepository = {
    save: jest.fn(),
    remove: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getExists: jest.fn(),
    })),
  };

  const mockRoleRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberService,
        {
          provide: getRepositoryToken(Member),
          useValue: mockMemberRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
        {
          provide: RoleService,
          useValue: {
            getRoleById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MemberService>(MemberService);
    roleService = module.get<RoleService>(RoleService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('changeRoleFromMember', () => {
    const memberId = 'member-id';
    const updateMemberDto = {
      roleId: 'new-role-id',
    } as UpdateMemberRoleDto;
    const existMember = {
      id: 'member-id',
      role: {
        id: 'old-role-id',
      },
    } as Member;
    const newRole = {
      id: 'new-role-id',
    } as Role;

    it('should return InternalServerErrorException if saving member is failed', async () => {
      jest.spyOn(service, 'getMemberById').mockResolvedValue(existMember);
      jest.spyOn(roleService, 'getRoleById').mockResolvedValue(newRole);
      mockMemberRepository.save.mockRejectedValue(new Error('save error'));
      await expect(
        service.changeRoleFromMember(memberId, updateMemberDto),
      ).rejects.toThrow(
        new InternalServerErrorException('Error while saving member'),
      );
    });

    it('should return ResultMessage if saving member is successfully', async () => {
      jest.spyOn(service, 'getMemberById').mockResolvedValue(existMember);
      jest.spyOn(roleService, 'getRoleById').mockResolvedValue(newRole);
      mockMemberRepository.save.mockResolvedValue(null);
      const result = await service.changeRoleFromMember(
        memberId,
        updateMemberDto,
      );
      expect(result).toEqual({
        message: "Successfully accepted member's role.",
      });
    });
  });

  describe('removeMember', () => {
    const memberId = 'member-id';
    const existMember = {
      id: 'member-id',
      role: {
        id: 'old-role-id',
      },
    } as Member;

    it('should return InternalServerErrorException if removing member is failed', async () => {
      jest.spyOn(service, 'getMemberById').mockResolvedValue(existMember);
      mockMemberRepository.remove.mockRejectedValue(new Error('save error'));
      await expect(service.removeMember(memberId)).rejects.toThrow(
        new InternalServerErrorException('Error while removing member'),
      );
    });

    it('should return ResultMessage if removing member is successfully', async () => {
      jest.spyOn(service, 'getMemberById').mockResolvedValue(existMember);
      mockMemberRepository.remove.mockResolvedValue(null);
      const result = await service.removeMember(memberId);
      expect(result).toEqual({
        message: `The member was successfully deleted.`,
      });
    });
  });

  describe('selfRemoveMember', () => {
    const userEmail = 'user@example.com';
    const companyId = 'company-id';
    const existMember = {
      id: 'member-id',
    } as Member;

    it('should return NotFoundException if member not found', async () => {
      mockMemberRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: undefined,
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getExists: undefined,
        getOne: jest.fn().mockReturnValue(null),
      });
      await expect(
        service.selfRemoveMember(userEmail, companyId),
      ).rejects.toThrow(new NotFoundException(`Member not found.`));
    });

    it('should return InternalServerErrorException if removing member is failed', async () => {
      mockMemberRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: undefined,
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getExists: undefined,
        getOne: jest.fn().mockReturnValue(existMember),
      });
      mockMemberRepository.remove.mockRejectedValue(new Error('save error'));
      await expect(
        service.selfRemoveMember(userEmail, companyId),
      ).rejects.toThrow(
        new InternalServerErrorException(`Error while removing member`),
      );
    });

    it('should return ResultMessage if removing member is successfully', async () => {
      mockMemberRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: undefined,
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getExists: undefined,
        getOne: jest.fn().mockReturnValue(existMember),
      });
      mockMemberRepository.remove.mockResolvedValue(null);
      const result = await service.selfRemoveMember(userEmail, companyId);
      expect(result).toEqual({
        message: `The member was successfully deleted.`,
      });
    });
  });

  describe('getMemberById', () => {
    const memberId = 'member-id';
    const existMember = {
      id: memberId,
    } as Member;

    it('should return NotFoundException if member not found', async () => {
      mockMemberRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: undefined,
        where: jest.fn().mockReturnThis(),
        andWhere: undefined,
        getExists: undefined,
        getOne: jest.fn().mockReturnValue(null),
      });
      await expect(service.getMemberById(memberId)).rejects.toThrow(
        new NotFoundException(`Member not found.`),
      );
    });

    it('should return Member if member found successfully', async () => {
      mockMemberRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: undefined,
        where: jest.fn().mockReturnThis(),
        andWhere: undefined,
        getExists: undefined,
        getOne: jest.fn().mockReturnValue(existMember),
      });
      const result = await service.getMemberById(memberId);
      expect(result).toEqual(existMember);
    });
  });

  describe('createMember', () => {
    const companyId = 'company-id';
    const userId = 'user-id';
    const roleName = 'new-role';
    const existRole = {
      id: 'role-id',
    } as Role;
    const newMember = {
      id: 'new-member-id',
    } as Member;

    it('should return InternalServerErrorException if saving new member is failed', async () => {
      jest.spyOn(service as any, 'getMemberRole').mockReturnValue(existRole);
      mockMemberRepository.create.mockResolvedValue(newMember);
      mockMemberRepository.save.mockRejectedValue(new Error('save error'));
      await expect(
        service.createMember(companyId, userId, roleName),
      ).rejects.toThrow(
        new InternalServerErrorException(`Creating member fail.`),
      );
    });

    it('should return Member if saving new member is successfully', async () => {
      jest.spyOn(service as any, 'getMemberRole').mockReturnValue(existRole);
      mockMemberRepository.create.mockResolvedValue(newMember);
      mockMemberRepository.save.mockReturnValue(newMember);
      const result = await service.createMember(companyId, userId);
      expect(result).toEqual(newMember);
    });
  });

  describe('getMemberRole', () => {
    const existRole = {
      id: 'role-id',
    } as Role;

    it('should return NotFoundException if role not found', async () => {
      mockRoleRepository.findOne.mockResolvedValue(null);
      await expect(service['getMemberRole']()).rejects.toThrow(
        new NotFoundException(`Member role not found.`),
      );
    });

    it('should return existing Role', async () => {
      mockRoleRepository.findOne.mockReturnValue(existRole);
      const result = await service['getMemberRole']();
      expect(result).toEqual(existRole);
    });
  });

  describe('checkUserMemberById', () => {
    const userId = 'user-id';
    const companyId = 'company-id';

    it('should return exist status of this user in this company', async () => {
      mockMemberRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: undefined,
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: undefined,
        getExists: jest.fn().mockReturnValue(true),
      });
      const result = await service.checkUserMemberById(companyId, userId);
      expect(result).toEqual(true);
    });
  });
});
