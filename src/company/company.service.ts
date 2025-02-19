import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ResultMessage } from '../global/interfaces/result-message';
import { AppService } from '../app.service';
import {
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Company } from './entities/company.entity';
import { v4 as uuidv4 } from 'uuid';
import { PaginationDto } from '../global/dto/pagination.dto';
import { PaginationOptionsDto } from '../global/dto/pagination-options.dto';
import { PaginationMetaDto } from '../global/dto/pagination-meta.dto';
import { UpdateCompanyVisibilityDto } from './dto/update-company-visibility.dto';
import { Visibility } from '../global/enums/visibility.enum';
import { User } from '../user/entities/user.entity';
import { RoleService } from '../role/role.service';
import { MemberService } from '../members/member.service';
import { InviteRequestStatus } from '../global/enums/invite-request-status.enum';
import { RoleEnum } from '../global/enums/role.enum';

@Injectable()
export class CompanyService {
  private readonly logger: Logger = new Logger(AppService.name);
  private s3: S3Client;
  private bucketName: string;

  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private roleService: RoleService,
    private memberService: MemberService,
  ) {
    this.s3 = new S3Client({
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucketName = this.configService.get('AWS_S3_BUCKET');
  }

  public async createNewCompany(
    email: string,
    createCompanyDto: CreateCompanyDto,
    file: Express.Multer.File,
  ): Promise<void> {
    this.logger.log('Attempting to create a new company.');
    const userId: string = await this.getUserId(email);
    const newCompany: Company = this.companyRepository.create({
      ...createCompanyDto,
      owner: { id: userId },
      logoUrl: '',
    });
    if (file) {
      newCompany.logoUrl = await this.uploadFileToS3(file);
    }
    this.logger.log('Saving the new company to the database.');
    try {
      const resultCompany: Company =
        await this.companyRepository.save(newCompany);
      await this.memberService.createMember(
        resultCompany.id,
        userId,
        RoleEnum.OWNER,
      );
      this.logger.log('Successfully created new company.');
      return;
    } catch (error) {
      this.logger.error('Error while saving company', error.stack);
    }
  }

  private async getUserId(email: string): Promise<string> {
    const userId = await this.userRepository
      .createQueryBuilder('user')
      .select('user.id', 'id')
      .where('user.emailLogin = :email', { email })
      .getRawOne()
      .then(result => result?.id);
    if (!userId) {
      throw new NotFoundException('User not found');
    } else {
      return userId;
    }
  }

  public async getAllCompanies(
    pageOptionsDto: PaginationOptionsDto,
    email: string,
  ): Promise<PaginationDto<Company>> {
    const queryBuilder: SelectQueryBuilder<Company> =
      this.companyRepository.createQueryBuilder('company');
    queryBuilder
      .leftJoinAndSelect('company.owner', 'owner')
      .leftJoinAndSelect('company.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .where('owner.emailLogin = :email', { email: email })
      .orWhere('user.emailLogin = :email', { email: email })
      .orWhere('visibility = :visible', { visible: Visibility.VISIBLE })
      .orderBy('company.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(+pageOptionsDto.take);

    const itemCount: number = await queryBuilder.getCount();
    const { entities } = await queryBuilder.getRawAndEntities();
    const pageMetaDto: PaginationMetaDto = new PaginationMetaDto({
      paginationOptionsDto: pageOptionsDto,
      itemCount,
    });
    return new PaginationDto(entities, pageMetaDto);
  }

  public async getCompanyById(id: string, email: string): Promise<Company> {
    const isCompanyOwnerOrAdmin: boolean = await this.roleService.checkUserRole(
      email,
      id,
      [RoleEnum.ADMIN, RoleEnum.OWNER],
    );
    const queryBuilder: SelectQueryBuilder<Company> =
      this.companyRepository.createQueryBuilder('company');
    if (isCompanyOwnerOrAdmin) {
      queryBuilder
        .leftJoinAndSelect('company.owner', 'owner')
        .leftJoinAndSelect('company.members', 'members')
        .leftJoinAndSelect('members.user', 'user')
        .leftJoinAndSelect('members.role', 'role')
        .leftJoinAndSelect(
          'company.requests',
          'requests',
          'requests.status = :requestStatus',
        )
        .leftJoinAndSelect('requests.requestedUser', 'requestedUser')
        .leftJoinAndSelect(
          'company.invitations',
          'invitations',
          'invitations.status = :invitationStatus',
        )
        .leftJoinAndSelect('invitations.invitedUser', 'invitedUser')
        .where('company.id = :companyId', { companyId: id })
        .setParameter('requestStatus', InviteRequestStatus.PENDING)
        .setParameter('invitationStatus', InviteRequestStatus.PENDING);
    } else {
      queryBuilder
        .leftJoinAndSelect('company.owner', 'owner')
        .leftJoinAndSelect('company.members', 'members')
        .leftJoinAndSelect('members.user', 'user')
        .leftJoinAndSelect('members.role', 'role')
        .where('company.id = :companyId', { companyId: id });
    }
    const { entities } = await queryBuilder.getRawAndEntities();
    const company: Company = entities[0];
    if (!company) {
      this.logger.error('Company not found.');
      throw new NotFoundException(`Company not found.`);
    } else {
      return company;
    }
  }

  public async updateCompanyById(
    id: string,
    email: string,
    updateCompanyDto: UpdateCompanyDto,
    file?: Express.Multer.File,
  ): Promise<Company> {
    this.logger.log('Attempting to update company.');
    const company: Company = await this.getCompanyById(id, email);
    if (file) {
      updateCompanyDto.logoUrl = await this.uploadFileToS3(file);
    }
    Object.assign(company, updateCompanyDto);
    this.logger.log('Saving the updated company to the database.');
    try {
      const updatedCompany: Company =
        await this.companyRepository.save(company);
      this.logger.log(`Successfully updated company.`);
      return updatedCompany;
    } catch (error) {
      this.logger.error(`Failed to update company with ID ${id}`, error.stack);
    }
  }

  public async updateVisibilityStatusForAllUsersCompany(
    email: string,
    updateCompanyVisibilityDto: UpdateCompanyVisibilityDto,
  ): Promise<ResultMessage> {
    this.logger.log('Saving the updated company to the database.');
    const userId: string = await this.getUserId(email);
    try {
      await this.companyRepository
        .createQueryBuilder()
        .update(Company)
        .set({ visibility: updateCompanyVisibilityDto.visibility })
        .where('ownerId = :userId', { userId: userId })
        .execute();
      return { message: 'Update companies visibility status successfully.' };
    } catch (error) {
      this.logger.error(
        `Failed to update companies visibility status`,
        error.stack,
      );
    }
  }

  public async removeCompanyById(
    id: string,
    email: string,
  ): Promise<ResultMessage> {
    this.logger.log(`Deleting company with ID ${id}.`);
    const company: Company = await this.getCompanyById(id, email);
    try {
      await this.companyRepository.remove(company);
      this.logger.log('Successfully removed company from the database.');
      return {
        message: `The company was successfully deleted.`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to remove company from the database`,
        error.stack,
      );
    }
  }

  private async uploadFileToS3(file: Express.Multer.File): Promise<string> {
    const fileKey = `logo/${uuidv4()}-${file.originalname}`;
    const params: PutObjectCommandInput = {
      Bucket: this.bucketName,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    };
    await this.s3.send(new PutObjectCommand(params));

    return `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${fileKey}`;
  }

  public getAllVisibilityStatuses(): string[] {
    return [Visibility.VISIBLE, Visibility.HIDDEN];
  }
}
