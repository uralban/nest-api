import { Test, TestingModule } from '@nestjs/testing';
import { InvitationService } from './invitation.service';
import { MemberService } from '../members/member.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Invitation } from './entities/invitation.entity';
import { Request } from '../request/entities/request.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PaginationOptionsDto } from '../global/dto/pagination-options.dto';
import { Order } from '../global/enums/order.enum';

describe('InvitationService', () => {
  let service: InvitationService;
  let memberService: MemberService;

  const mockInvitationRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getRawAndEntities: jest.fn(),
      getCount: jest.fn(),
    })),
  };

  const mockRequestRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationService,
        {
          provide: getRepositoryToken(Invitation),
          useValue: mockInvitationRepository,
        },
        {
          provide: getRepositoryToken(Request),
          useValue: mockRequestRepository,
        },
        {
          provide: MemberService,
          useValue: {
            checkUserMemberById: jest.fn(),
            createMember: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InvitationService>(InvitationService);
    memberService = module.get<MemberService>(MemberService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInvite', () => {
    const companyId = 'companyId';
    const invitedUserId = 'invitedUserId';
    const userId = 'userId';
    const existInvite = {
      id: 'invite-id',
    };
    const createInvitationDto = {
      companyId,
      invitedUserId,
      userId,
    } as CreateInvitationDto;
    const newInvite = {
      ...createInvitationDto,
      id: 'new-invite-id',
    };

    it('should return ForbiddenException if user already in company', async () => {
      jest
        .spyOn(memberService, 'checkUserMemberById')
        .mockImplementation(() => Promise.resolve(true));
      await expect(service.createInvite(createInvitationDto)).rejects.toThrow(
        new ForbiddenException('This user already in company'),
      );
      expect(memberService.checkUserMemberById).toHaveBeenCalledWith(
        createInvitationDto.invitedUserId,
        createInvitationDto.companyId,
      );
    });

    it('should return ForbiddenException if user already have invite', async () => {
      jest
        .spyOn(memberService, 'checkUserMemberById')
        .mockImplementation(() => Promise.resolve(false));
      mockInvitationRepository.findOne.mockReturnValue(existInvite);
      await expect(service.createInvite(createInvitationDto)).rejects.toThrow(
        new ForbiddenException('User already have invite'),
      );
    });

    it('should return InternalServerErrorException if save new invite is failed', async () => {
      jest
        .spyOn(memberService, 'checkUserMemberById')
        .mockImplementation(() => Promise.resolve(false));
      mockInvitationRepository.findOne.mockReturnValue(null);
      mockInvitationRepository.create.mockReturnValue(newInvite);
      mockInvitationRepository.save.mockRejectedValue(new Error('save error'));
      await expect(service.createInvite(createInvitationDto)).rejects.toThrow(
        new InternalServerErrorException('Error while saving invite'),
      );
    });

    it('should return ResultMessage after successfully create invite', async () => {
      jest
        .spyOn(memberService, 'checkUserMemberById')
        .mockImplementation(() => Promise.resolve(false));
      mockInvitationRepository.findOne.mockReturnValue(null);
      mockInvitationRepository.create.mockReturnValue(newInvite);
      mockInvitationRepository.save.mockResolvedValue(null);
      const result = await service.createInvite(createInvitationDto);
      expect(result).toEqual({ message: 'The invite has been created.' });
    });
  });

  describe('getAllUsersInvites', () => {
    it('should return paginated invitation list', async () => {
      const userEmail = 'test@email.com';
      const pageOptionsDto = {
        order: Order.ASC,
        page: 1,
        take: 3,
      } as PaginationOptionsDto;
      const existInvite = {
        id: 'invite-id',
      } as Invitation;

      mockInvitationRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getRawAndEntities: jest.fn().mockResolvedValue({
          entities: [existInvite],
        }),
      });
      const result = await service.getAllUsersInvites(
        pageOptionsDto,
        userEmail,
      );
      expect(result).toEqual({
        data: [existInvite],
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

  describe('acceptInvite', () => {
    const inviteId = 'invite-id';
    const existInvite = {
      id: 'invite-id',
      invitedUser: {
        id: 'user-id',
      },
      company: {
        id: 'company-id',
      },
    } as Invitation;
    const existRequest = {
      id: 'request-id',
    } as Request;

    it('should return InternalServerErrorException if saving invite is failed', async () => {
      jest.spyOn(service, 'getInviteById').mockResolvedValue(existInvite);
      jest
        .spyOn(memberService, 'checkUserMemberById')
        .mockImplementation(() => Promise.resolve(false));
      mockRequestRepository.findOne.mockReturnValue(null);
      mockInvitationRepository.save.mockRejectedValue(new Error('save error'));
      await expect(service.acceptInvite(inviteId)).rejects.toThrow(
        new InternalServerErrorException('Failed to accept invitation'),
      );
    });

    it('should return InternalServerErrorException if saving request is failed', async () => {
      jest.spyOn(service, 'getInviteById').mockResolvedValue(existInvite);
      jest
        .spyOn(memberService, 'checkUserMemberById')
        .mockImplementation(() => Promise.resolve(false));
      mockRequestRepository.findOne.mockReturnValue(existRequest);
      mockInvitationRepository.save.mockResolvedValue(null);
      mockRequestRepository.save.mockRejectedValue(new Error('save error'));
      await expect(service.acceptInvite(inviteId)).rejects.toThrow(
        new InternalServerErrorException('Failed to accept invitation'),
      );
    });

    it('should return ResultMessage if saving successfully', async () => {
      jest.spyOn(service, 'getInviteById').mockResolvedValue(existInvite);
      jest
        .spyOn(memberService, 'checkUserMemberById')
        .mockImplementation(() => Promise.resolve(false));
      mockRequestRepository.findOne.mockReturnValue(existRequest);
      mockInvitationRepository.save.mockResolvedValue(null);
      mockRequestRepository.save.mockResolvedValue(null);
      jest.spyOn(memberService, 'createMember').mockResolvedValue(null);
      const result = await service.acceptInvite(inviteId);
      expect(result).toEqual({ message: 'Successfully accepted invitation.' });
    });
  });

  describe('declineInvitation', () => {
    const inviteId = 'invite-id';
    const existInvite = {
      id: 'invite-id',
      invitedUser: {
        id: 'user-id',
      },
      company: {
        id: 'company-id',
      },
    } as Invitation;

    it('should return InternalServerErrorException if saving invite is failed', async () => {
      jest.spyOn(service, 'getInviteById').mockResolvedValue(existInvite);
      mockInvitationRepository.save.mockRejectedValue(new Error('save error'));
      await expect(service.declineInvitation(inviteId)).rejects.toThrow(
        new InternalServerErrorException('Failed to decline invitation'),
      );
    });

    it('should return ResultMessage if saving successfully', async () => {
      jest.spyOn(service, 'getInviteById').mockResolvedValue(existInvite);
      mockInvitationRepository.save.mockResolvedValue(null);
      const result = await service.declineInvitation(inviteId);
      expect(result).toEqual({ message: 'Successfully decline invitation.' });
    });
  });

  describe('getInviteById', () => {
    const inviteId = 'invite-id';
    const existInvite = {
      id: 'invite-id',
      invitedUser: {
        id: 'user-id',
      },
      company: {
        id: 'company-id',
      },
    } as Invitation;

    it('should return NotFoundException if invitation not found', async () => {
      mockInvitationRepository.findOne.mockReturnValue(null);
      await expect(service.getInviteById(inviteId)).rejects.toThrow(
        new NotFoundException(`Invitation not found.`),
      );
    });

    it('should return invite', async () => {
      mockInvitationRepository.findOne.mockReturnValue(existInvite);
      const result = await service.getInviteById(inviteId);
      expect(result).toEqual(existInvite);
    });
  });
});
