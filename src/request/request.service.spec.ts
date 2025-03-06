import { Test, TestingModule } from '@nestjs/testing';
import { RequestService } from './request.service';
import { MemberService } from '../members/member.service';
import { Invitation } from '../invitation/entities/invitation.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Request } from './entities/request.entity';
import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateRequestDto } from './dto/create-request.dto';
import { Order } from '../global/enums/order.enum';
import { PaginationOptionsDto } from '../global/dto/pagination-options.dto';

describe('RequestService', () => {
  let service: RequestService;
  let memberService: MemberService;

  const mockRequestRepository = {
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

  const mockInvitationRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestService,
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

    service = module.get<RequestService>(RequestService);
    memberService = module.get<MemberService>(MemberService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRequest', () => {
    const companyId = 'companyId';
    const userId = 'userId';
    const existRequest = {
      id: 'request-id',
    };
    const createRequestDto = {
      companyId,
      userId,
    } as CreateRequestDto;
    const newRequest = {
      ...createRequestDto,
      id: 'new-request-id',
    } as Request;

    it('should return ForbiddenException if user already in company', async () => {
      jest
        .spyOn(memberService, 'checkUserMemberById')
        .mockImplementation(() => Promise.resolve(true));
      await expect(service.createRequest(createRequestDto)).rejects.toThrow(
        new ForbiddenException('You already in company'),
      );
      expect(memberService.checkUserMemberById).toHaveBeenCalledWith(
        createRequestDto.userId,
        createRequestDto.companyId,
      );
    });

    it('should return ForbiddenException if user already have invite', async () => {
      jest
        .spyOn(memberService, 'checkUserMemberById')
        .mockImplementation(() => Promise.resolve(false));
      mockRequestRepository.findOne.mockReturnValue(existRequest);
      await expect(service.createRequest(createRequestDto)).rejects.toThrow(
        new ForbiddenException('Request already exist'),
      );
    });

    it('should return InternalServerErrorException if save new invite is failed', async () => {
      jest
        .spyOn(memberService, 'checkUserMemberById')
        .mockImplementation(() => Promise.resolve(false));
      mockRequestRepository.findOne.mockReturnValue(null);
      mockRequestRepository.create.mockReturnValue(newRequest);
      mockRequestRepository.save.mockRejectedValue(new Error('save error'));
      await expect(service.createRequest(createRequestDto)).rejects.toThrow(
        new InternalServerErrorException('Error while saving request'),
      );
    });

    it('should return ResultMessage after successfully create invite', async () => {
      jest
        .spyOn(memberService, 'checkUserMemberById')
        .mockImplementation(() => Promise.resolve(false));
      mockRequestRepository.findOne.mockReturnValue(null);
      mockRequestRepository.create.mockReturnValue(newRequest);
      mockRequestRepository.save.mockResolvedValue(null);
      const result = await service.createRequest(createRequestDto);
      expect(result).toEqual({ message: 'The request has been created.' });
    });
  });

  describe('getAllUsersRequests', () => {
    it('should return paginated request list', async () => {
      const userEmail = 'test@email.com';
      const pageOptionsDto = {
        order: Order.ASC,
        page: 1,
        take: 3,
      } as PaginationOptionsDto;
      const existRequest = {
        id: 'request-id',
      } as Request;

      mockRequestRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getRawAndEntities: jest.fn().mockResolvedValue({
          entities: [existRequest],
        }),
      });
      const result = await service.getAllUsersRequests(
        pageOptionsDto,
        userEmail,
      );
      expect(result).toEqual({
        data: [existRequest],
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

  describe('acceptRequest', () => {
    const requestId = 'request-id';
    const existInvite = {
      id: 'invite-id',
    } as Invitation;
    const existRequest = {
      id: 'request-id',
      requestedUser: {
        id: 'user-id',
      },
      company: {
        id: 'company-id',
      },
    } as Request;

    it('should return InternalServerErrorException if saving request is failed', async () => {
      jest.spyOn(service, 'getRequestById').mockResolvedValue(existRequest);
      mockInvitationRepository.findOne.mockReturnValue(existInvite);
      mockRequestRepository.save.mockRejectedValue(new Error('save error'));
      await expect(service.acceptRequest(requestId)).rejects.toThrow(
        new InternalServerErrorException('Error while saving request'),
      );
    });

    it('should return InternalServerErrorException if saving invite is failed', async () => {
      jest.spyOn(service, 'getRequestById').mockResolvedValue(existRequest);
      mockInvitationRepository.findOne.mockReturnValue(existInvite);
      mockRequestRepository.save.mockResolvedValue(null);
      mockInvitationRepository.save.mockRejectedValue(new Error('save error'));
      await expect(service.acceptRequest(requestId)).rejects.toThrow(
        new InternalServerErrorException('Error while saving request'),
      );
    });

    it('should return InternalServerErrorException if create new member is failed', async () => {
      jest.spyOn(service, 'getRequestById').mockResolvedValue(existRequest);
      mockInvitationRepository.findOne.mockReturnValue(null);
      mockRequestRepository.save.mockResolvedValue(null);
      jest
        .spyOn(memberService, 'createMember')
        .mockRejectedValue(new Error('save error'));
      await expect(service.acceptRequest(requestId)).rejects.toThrow(
        new InternalServerErrorException('Error while saving request'),
      );
    });

    it('should return ResultMessage if saving successfully', async () => {
      jest.spyOn(service, 'getRequestById').mockResolvedValue(existRequest);
      mockInvitationRepository.findOne.mockReturnValue(null);
      mockRequestRepository.save.mockResolvedValue(null);
      jest.spyOn(memberService, 'createMember').mockResolvedValue(null);
      const result = await service.acceptRequest(requestId);
      expect(result).toEqual({ message: 'Successfully accepted request.' });
    });
  });

  describe('declineRequest', () => {
    const requestId = 'request-id';
    const existRequest = {
      id: 'request-id',
      requestedUser: {
        id: 'user-id',
      },
      company: {
        id: 'company-id',
      },
    } as Request;

    it('should return InternalServerErrorException if create decline request is failed', async () => {
      jest.spyOn(service, 'getRequestById').mockResolvedValue(existRequest);
      mockRequestRepository.save.mockRejectedValue(new Error('save error'));
      await expect(service.declineRequest(requestId)).rejects.toThrow(
        new InternalServerErrorException('Error while saving request'),
      );
    });

    it('should return ResultMessage if saving successfully', async () => {
      jest.spyOn(service, 'getRequestById').mockResolvedValue(existRequest);
      mockRequestRepository.save.mockResolvedValue(null);
      const result = await service.declineRequest(requestId);
      expect(result).toEqual({ message: 'Successfully decline request.' });
    });
  });

  describe('getRequestById', () => {
    const requestId = 'request-id';
    const existRequest = {
      id: 'request-id',
      requestedUser: {
        id: 'user-id',
      },
      company: {
        id: 'company-id',
      },
    } as Request;

    it('should return NotFoundException if request not found', async () => {
      mockRequestRepository.findOne.mockReturnValue(null);
      await expect(service.getRequestById(requestId)).rejects.toThrow(
        new NotFoundException(`Request not found.`),
      );
    });

    it('should return request', async () => {
      mockRequestRepository.findOne.mockReturnValue(existRequest);
      const result = await service.getRequestById(requestId);
      expect(result).toEqual(existRequest);
    });
  });
});
