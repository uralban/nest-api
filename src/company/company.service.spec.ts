import { Test, TestingModule } from '@nestjs/testing';
import { CompanyService } from './company.service';
import { ConfigService } from '@nestjs/config';
import { RoleService } from '../role/role.service';
import { MemberService } from '../members/member.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { Company } from './entities/company.entity';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as uuid from 'uuid';
import { CreateCompanyDto } from './dto/create-company.dto';
import { Visibility } from '../global/enums/visibility.enum';
import { RoleEnum } from '../global/enums/role.enum';
import { PaginationOptionsDto } from '../global/dto/pagination-options.dto';
import { Order } from '../global/enums/order.enum';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateCompanyVisibilityDto } from './dto/update-company-visibility.dto';

describe('CompanyService', () => {
  let service: CompanyService;
  let roleService: RoleService;
  let memberService: MemberService;

  const mockCompanyRepository = {
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      then: jest.fn(),
      getRawAndEntities: jest.fn(),
      getCount: jest.fn(),
      execute: jest.fn(),
    })),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockUserRepository = {
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockReturnThis(),
      then: jest.fn(),
    })),
  };

  beforeEach(async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'AWS_REGION') return 'us-east-1';
      if (key === 'AWS_S3_BUCKET') return 'my-test-bucket';
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        {
          provide: getRepositoryToken(Company),
          useValue: mockCompanyRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: RoleService,
          useValue: {
            checkUserRole: jest.fn(),
          },
        },
        {
          provide: MemberService,
          useValue: {
            createMember: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
    roleService = module.get<RoleService>(RoleService);
    memberService = module.get<MemberService>(MemberService);

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

  describe('getUserId', () => {
    const userEmail = 'test@email.com';

    it('should return NotFoundException if user not found', async () => {
      mockUserRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue(undefined),
      });
      await expect(service['getUserId'](userEmail)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return user Id', async () => {
      mockUserRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue('userId'),
      });
      const result = await service['getUserId'](userEmail);
      expect(result).toEqual('userId');
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
      const expectedUrl = `https://${bucketName}.s3.${region}.amazonaws.com/logo/${mockUuid}-${file.originalname}`;
      jest.spyOn(uuid as any, 'v4').mockReturnValue(mockUuid);

      const result = await (service as any).uploadFileToS3(file);

      expect(uuid.v4).toHaveBeenCalled();
      expect(mockConfigService.get).toHaveBeenCalledWith('AWS_REGION');
      expect(mockConfigService.get).toHaveBeenCalledWith('AWS_S3_BUCKET');
      expect((service as any).s3.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: bucketName,
            Key: `logo/${mockUuid}-${file.originalname}`,
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

  describe('createNewCompany', () => {
    const userEmail = 'test@email.com';
    const companyId = 'company-id';
    const userId = 'user-id';
    const createCompanyDto = {
      companyName: 'company',
      companyDescription: 'description',
      visibility: Visibility.HIDDEN,
    } as CreateCompanyDto;
    const file = {
      filename: 'avatar',
    } as Express.Multer.File;
    const newCompany = {
      ...createCompanyDto,
      owner: { id: userId },
      logoUrl: '',
    } as Company;
    const resultCompany = {
      id: companyId,
    } as Company;

    it('should save new company and create owner member', async () => {
      jest.spyOn(service as any, 'getUserId').mockResolvedValue(userId);
      mockCompanyRepository.create.mockReturnValue(newCompany);
      jest
        .spyOn(service as any, 'uploadFileToS3')
        .mockResolvedValue('avatar-url');
      mockCompanyRepository.save.mockResolvedValue(resultCompany);
      jest.spyOn(memberService, 'createMember').mockResolvedValue(null);
      await service.createNewCompany(userEmail, createCompanyDto, file);
      expect(mockCompanyRepository.create).toHaveBeenCalled();
      expect(mockCompanyRepository.save).toHaveBeenCalledWith({
        ...newCompany,
        logoUrl: 'avatar-url',
      });
      expect(memberService.createMember).toHaveBeenCalledWith(
        companyId,
        userId,
        RoleEnum.OWNER,
      );
    });

    it('should handle error in companyRepository.save gracefully', async () => {
      jest.spyOn(service as any, 'getUserId').mockResolvedValue(userId);
      mockCompanyRepository.create.mockReturnValue(newCompany);
      jest
        .spyOn(service as any, 'uploadFileToS3')
        .mockResolvedValue('avatar-url');
      mockCompanyRepository.save.mockRejectedValue(
        new Error('Database save failed'),
      );
      await expect(
        service.createNewCompany(userEmail, createCompanyDto, file),
      ).resolves.toBeUndefined();
      expect(mockCompanyRepository.create).toHaveBeenCalledWith({
        ...createCompanyDto,
        owner: { id: userId },
        logoUrl: '',
      });
      expect(mockCompanyRepository.save).toHaveBeenCalledWith({
        ...newCompany,
        logoUrl: 'avatar-url',
      });
      expect(memberService.createMember).not.toHaveBeenCalled();
    });

    it('should handle error in memberService.createMember gracefully', async () => {
      jest.spyOn(service as any, 'getUserId').mockResolvedValue(userId);
      mockCompanyRepository.create.mockReturnValue(newCompany);
      jest
        .spyOn(service as any, 'uploadFileToS3')
        .mockResolvedValue('avatar-url');
      mockCompanyRepository.save.mockResolvedValue(resultCompany);
      jest
        .spyOn(memberService, 'createMember')
        .mockRejectedValue(new Error('Member creation failed'));
      await expect(
        service.createNewCompany(userEmail, createCompanyDto, file),
      ).resolves.toBeUndefined();
      expect(mockCompanyRepository.create).toHaveBeenCalledWith({
        ...createCompanyDto,
        owner: { id: userId },
        logoUrl: '',
      });
      expect(mockCompanyRepository.save).toHaveBeenCalledWith({
        ...newCompany,
        logoUrl: 'avatar-url',
      });
      expect(memberService.createMember).toHaveBeenCalledWith(
        companyId,
        userId,
        RoleEnum.OWNER,
      );
    });
  });

  describe('getAllCompanies', () => {
    it('should return paginated company list', async () => {
      const userEmail = 'test@email.com';
      const pageOptionsDto = {
        order: Order.ASC,
        page: 1,
        take: 3,
      } as PaginationOptionsDto;
      const company = {
        id: 'company-id',
      } as Company;
      mockCompanyRepository.createQueryBuilder.mockReturnValue({
        execute: undefined,
        getRawOne: undefined,
        select: undefined,
        set: undefined,
        setParameter: undefined,
        then: undefined,
        update: undefined,
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getRawAndEntities: jest.fn().mockResolvedValue({
          entities: [company],
        }),
      });
      const result = await service.getAllCompanies(pageOptionsDto, userEmail);
      expect(result).toEqual({
        data: [company],
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

  describe('getCompanyById', () => {
    const userEmail = 'test@email.com';
    const companyId = 'company-id';
    const company = {
      id: 'company-id',
    } as Company;

    it('should return NotFoundException if company not found', async () => {
      jest
        .spyOn(roleService, 'checkUserRole')
        .mockImplementation(() => Promise.resolve(false));
      mockCompanyRepository.createQueryBuilder.mockReturnValue({
        execute: undefined,
        getRawOne: undefined,
        select: undefined,
        set: undefined,
        setParameter: undefined,
        then: undefined,
        update: undefined,
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orWhere: undefined,
        orderBy: undefined,
        skip: undefined,
        take: undefined,
        getCount: undefined,
        getRawAndEntities: jest.fn().mockResolvedValue({
          entities: [],
        }),
      });
      await expect(
        service.getCompanyById(companyId, userEmail),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return company for owner or admin', async () => {
      jest
        .spyOn(roleService, 'checkUserRole')
        .mockImplementation(() => Promise.resolve(true));
      mockCompanyRepository.createQueryBuilder.mockReturnValue({
        execute: undefined,
        getRawOne: undefined,
        select: undefined,
        set: undefined,
        setParameter: jest.fn().mockReturnThis(),
        then: undefined,
        update: undefined,
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orWhere: undefined,
        orderBy: undefined,
        skip: undefined,
        take: undefined,
        getCount: undefined,
        getRawAndEntities: jest.fn().mockResolvedValue({
          entities: [company],
        }),
      });
      const result = await service.getCompanyById(companyId, userEmail);
      expect(result).toEqual(company);
    });

    it('should return company for not owner and not admin', async () => {
      jest
        .spyOn(roleService, 'checkUserRole')
        .mockImplementation(() => Promise.resolve(false));
      mockCompanyRepository.createQueryBuilder.mockReturnValue({
        execute: undefined,
        getRawOne: undefined,
        select: undefined,
        set: undefined,
        setParameter: undefined,
        then: undefined,
        update: undefined,
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orWhere: undefined,
        orderBy: undefined,
        skip: undefined,
        take: undefined,
        getCount: undefined,
        getRawAndEntities: jest.fn().mockResolvedValue({
          entities: [company],
        }),
      });
      const result = await service.getCompanyById(companyId, userEmail);
      expect(result).toEqual(company);
    });
  });

  describe('updateCompanyById', () => {
    const companyId = 'company-id';
    const userEmail = 'test@email.com';
    const updateCompanyDto = {
      companyName: 'new-company-name',
      companyDescription: 'new-company-desc',
      visibility: Visibility.HIDDEN,
    } as UpdateCompanyDto;
    const file = {
      filename: 'file.jpg',
    } as Express.Multer.File;
    const existCompany = {
      id: 'company-id',
      companyName: 'old-company-name',
      logoUrl: 'logo.png',
      visibility: Visibility.VISIBLE,
    } as Company;

    it('should return InternalServerErrorException if saving company is failed', async () => {
      jest.spyOn(service, 'getCompanyById').mockResolvedValue(existCompany);
      mockCompanyRepository.save.mockRejectedValue(new Error('Save error'));
      await expect(
        service.updateCompanyById(companyId, userEmail, updateCompanyDto),
      ).rejects.toThrow(
        new InternalServerErrorException(
          `Failed to update company with ID ${companyId}`,
        ),
      );
    });

    it('should return updated company when new file is not get', async () => {
      jest.spyOn(service, 'getCompanyById').mockResolvedValue(existCompany);
      mockCompanyRepository.save.mockResolvedValue({
        ...existCompany,
        ...updateCompanyDto,
      });
      const result = await service.updateCompanyById(
        companyId,
        userEmail,
        updateCompanyDto,
      );
      expect(result).toEqual({
        id: 'company-id',
        companyName: 'new-company-name',
        companyDescription: 'new-company-desc',
        visibility: Visibility.HIDDEN,
        logoUrl: 'logo.png',
      });
      expect(mockCompanyRepository.save).toHaveBeenCalledWith({
        id: 'company-id',
        companyName: 'new-company-name',
        companyDescription: 'new-company-desc',
        visibility: Visibility.HIDDEN,
        logoUrl: 'logo.png',
      });
    });

    it('should return updated company when new file is get', async () => {
      jest.spyOn(service, 'getCompanyById').mockResolvedValue(existCompany);
      jest
        .spyOn(service as any, 'uploadFileToS3')
        .mockReturnValue('new-logo.png');
      mockCompanyRepository.save.mockResolvedValue({
        ...existCompany,
        ...updateCompanyDto,
        logoUrl: 'new-logo.png',
      });
      const result = await service.updateCompanyById(
        companyId,
        userEmail,
        updateCompanyDto,
        file,
      );
      expect(result).toEqual({
        id: 'company-id',
        companyName: 'new-company-name',
        companyDescription: 'new-company-desc',
        visibility: Visibility.HIDDEN,
        logoUrl: 'new-logo.png',
      });
      expect(mockCompanyRepository.save).toHaveBeenCalledWith({
        id: 'company-id',
        companyName: 'new-company-name',
        companyDescription: 'new-company-desc',
        visibility: Visibility.HIDDEN,
        logoUrl: 'new-logo.png',
      });
    });
  });

  describe('updateVisibilityStatusForAllUsersCompany', () => {
    const userEmail = 'test@email.com';
    const userId = 'user-id';
    const updateCompanyVisibilityDto = {
      visibility: Visibility.HIDDEN,
    } as UpdateCompanyVisibilityDto;

    it('should return InternalServerErrorException if createQueryBuilder executing filed', async () => {
      jest.spyOn(service as any, 'getUserId').mockReturnValue(userId);
      mockCompanyRepository.createQueryBuilder.mockReturnValue({
        execute: jest
          .fn()
          .mockRejectedValue(new Error('Database update failed')),
        getRawOne: undefined,
        select: undefined,
        set: jest.fn().mockReturnThis(),
        setParameter: undefined,
        then: undefined,
        update: jest.fn().mockReturnThis(),
        leftJoinAndSelect: undefined,
        where: jest.fn().mockReturnThis(),
        orWhere: undefined,
        orderBy: undefined,
        skip: undefined,
        take: undefined,
        getCount: undefined,
        getRawAndEntities: undefined,
      });
      await expect(
        service.updateVisibilityStatusForAllUsersCompany(
          userEmail,
          updateCompanyVisibilityDto,
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should return ResultMessage if visibility is changed successfully', async () => {
      jest.spyOn(service as any, 'getUserId').mockReturnValue(userId);
      mockCompanyRepository.createQueryBuilder.mockReturnValue({
        execute: jest.fn().mockReturnThis(),
        getRawOne: undefined,
        select: undefined,
        set: jest.fn().mockReturnThis(),
        setParameter: undefined,
        then: undefined,
        update: jest.fn().mockReturnThis(),
        leftJoinAndSelect: undefined,
        where: jest.fn().mockReturnThis(),
        orWhere: undefined,
        orderBy: undefined,
        skip: undefined,
        take: undefined,
        getCount: undefined,
        getRawAndEntities: undefined,
      });
      const result = await service.updateVisibilityStatusForAllUsersCompany(
        userEmail,
        updateCompanyVisibilityDto,
      );
      expect(result).toEqual({
        message: 'Update companies visibility status successfully.',
      });
      expect(
        mockCompanyRepository.createQueryBuilder().execute,
      ).toHaveBeenCalled();
      expect(
        mockCompanyRepository.createQueryBuilder().set,
      ).toHaveBeenCalledWith({
        visibility: updateCompanyVisibilityDto.visibility,
      });
    });
  });

  describe('removeCompanyById', () => {
    const companyId = 'company-id';
    const userEmail = 'test@email.com';
    const existCompany = {
      id: 'company-id',
    } as Company;

    it('should return InternalServerErrorException if removeCompanyById executing filed', async () => {
      jest.spyOn(service, 'getCompanyById').mockResolvedValue(existCompany);
      mockCompanyRepository.remove.mockRejectedValue(
        new Error('Company remove failed'),
      );
      await expect(
        service.removeCompanyById(companyId, userEmail),
      ).rejects.toThrow(
        new InternalServerErrorException(
          `Failed to remove company from the database`,
        ),
      );
    });

    it('should remove an existing company and return ResultMessage', async () => {
      jest.spyOn(service, 'getCompanyById').mockResolvedValue(existCompany);
      mockCompanyRepository.remove.mockResolvedValue(null);
      const result = await service.removeCompanyById(companyId, userEmail);
      expect(result).toEqual({
        message: 'The company was successfully deleted.',
      });
      expect(mockCompanyRepository.remove).toHaveBeenCalledWith(existCompany);
    });
  });

  describe('getAllVisibilityStatuses', () => {
    it('should return all statuses from Visibility enum', () => {
      const result = service.getAllVisibilityStatuses();
      expect(result).toEqual([Visibility.VISIBLE, Visibility.HIDDEN]);
    });
  });
});
