import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
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
import { Visibility } from '../visibility/entity/visibility.entity';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../user/entities/user.entity';
import { PaginationDto } from '../global/dto/pagination.dto';
import { PaginationOptionsDto } from '../global/dto/pagination-options.dto';
import { PaginationMetaDto } from '../global/dto/pagination-meta.dto';
import { UpdateCompanyVisibilityDto } from './dto/update-company-visibility.dto';

@Injectable()
export class CompanyService {
  private readonly logger: Logger = new Logger(AppService.name);
  private s3: S3Client;
  private bucketName: string;

  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Visibility)
    private visibilityRepository: Repository<Visibility>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
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
    createCompanyDto: CreateCompanyDto,
    email: string,
  ): Promise<void> {
    this.logger.log('Attempting to create a new company.');

    const { visibilityId, ...companyData } = createCompanyDto;

    const companyVisibility: Visibility =
      await this.getCompanyVisibilityById(visibilityId);
    this.logger.log('Visibility status found for new company.');

    const user: User = await this.userRepository.findOne({
      where: { emailLogin: email },
    });
    if (!user) {
      this.logger.error('User not found.');
      throw new Error('User not found.');
    }
    this.logger.log('User found for new company.');

    const newCompany: Company = this.companyRepository.create({
      ...companyData,
      visibility: companyVisibility,
      user: user,
      logoUrl: '',
    });

    this.logger.log('Saving the new company to the database.');
    try {
      await this.companyRepository.save(newCompany);
      this.logger.log('Successfully created new company.');
      return;
    } catch (error) {
      this.logger.error('Error while saving company', error.stack);
    }
  }

  private async getCompanyVisibilityById(
    visibilityId: string,
  ): Promise<Visibility> {
    const companyVisibility: Visibility =
      await this.visibilityRepository.findOne({
        where: { id: visibilityId },
      });
    if (!companyVisibility) {
      this.logger.error('Visibility status not found.');
      throw new Error('Visibility status not found.');
    }
    return companyVisibility;
  }

  public async getAllCompanies(
    pageOptionsDto: PaginationOptionsDto,
    email: string,
  ): Promise<PaginationDto<Company>> {
    const queryBuilder: SelectQueryBuilder<Company> =
      this.companyRepository.createQueryBuilder('company');
    queryBuilder
      .leftJoinAndSelect('company.visibility', 'visibility')
      .leftJoinAndSelect('company.user', 'user')
      .where('user.emailLogin = :email', { email: email })
      .orWhere('visibility.visibilityName = :visible', { visible: 'visible' })
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
    const company: Company = await this.companyRepository.findOne({
      where: {
        id: id,
      },
      relations: {
        visibility: true,
        user: true,
      },
    });
    if (!company) {
      this.logger.error('Company not found.');
      throw new NotFoundException(`Company not found.`);
    } else {
      if (company.user.emailLogin !== email) {
        this.logger.error('Only owner can to delete this company.');
        throw new UnauthorizedException(
          'Only owner can to delete this company.',
        );
      }
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
    const { visibilityId, ...newCompanyData } = updateCompanyDto;

    const companyVisibility: Visibility =
      await this.getCompanyVisibilityById(visibilityId);
    this.logger.log('Visibility status found for new company.');

    Object.assign(company, newCompanyData, { visibility: companyVisibility });

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
    this.logger.log('Attempting to update companies visibility.');
    const newVisibility: Visibility = await this.getCompanyVisibilityById(
      updateCompanyVisibilityDto.visibilityId,
    );
    this.logger.log('Saving the updated company to the database.');
    try {
      await this.companyRepository
        .createQueryBuilder()
        .update(Company)
        .set({ visibility: newVisibility })
        .where('user.emailLogin = :email', { email })
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
    email: string,
    id: string,
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

  public async uploadFileToS3(file: Express.Multer.File): Promise<string> {
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
}
