import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { User } from './entities/user.entity';
import { AppService } from '../app.service';
import { InjectRepository } from '@nestjs/typeorm';
import { ResultMessage } from '../global/interfaces/result-message';
import * as bcrypt from 'bcrypt';
import { PaginationOptionsDto } from '../global/dto/pagination-options.dto';
import { PaginationDto } from '../global/dto/pagination.dto';
import { PaginationMetaDto } from '../global/dto/pagination-meta.dto';
import { v4 as uuidv4 } from 'uuid';
import {
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { GetUsersByNameDto } from './dto/get-users-by-name.dto';

@Injectable()
export class UserService {
  private readonly logger: Logger = new Logger(AppService.name);
  private readonly saltOrRounds: string | number = 10;
  private s3: S3Client;
  private bucketName: string;

  constructor(
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

  public async createUser(createUserDto: CreateUserDto): Promise<void> {
    this.logger.log('Attempting to create a new user.');

    const { password, ...userData } = createUserDto;

    const hashedPassword: string = await bcrypt.hash(
      password,
      this.saltOrRounds,
    );
    this.logger.log('Password hashed successfully for new user.');

    const newUser: User = this.userRepository.create({
      ...userData,
      passHash: hashedPassword,
      avatarUrl: '',
    });

    this.logger.log('Saving the new user to the database.');
    try {
      await this.userRepository.save(newUser);
      this.logger.log('Successfully created new user.');
      return;
    } catch (error) {
      this.logger.error('Error while saving user', error.stack);
      throw new InternalServerErrorException('Error while saving user');
    }
  }

  public async getAllUsers(
    pageOptionsDto: PaginationOptionsDto,
  ): Promise<PaginationDto<User>> {
    const queryBuilder: SelectQueryBuilder<User> =
      this.userRepository.createQueryBuilder('user');
    queryBuilder
      .orderBy('user.createdAt', pageOptionsDto.order)
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

  public async getUserById(id: string): Promise<User> {
    const user: User = await this.userRepository.findOne({
      where: {
        id: id,
      },
    });
    if (!user) {
      this.logger.error('User not found.');
      throw new NotFoundException(`User with ID ${id} not found.`);
    } else {
      return user;
    }
  }

  public async getUserByEmail(email: string): Promise<User> {
    const user: User = await this.userRepository.findOne({
      where: {
        emailLogin: email,
      },
    });
    if (!user) {
      this.logger.error('User not found.');
      throw new NotFoundException(`User with email ${email} not found.`);
    } else {
      return user;
    }
  }

  public async getCheckEmailExist(email: string): Promise<string> {
    const user: User = await this.userRepository.findOne({
      where: {
        emailLogin: email,
      },
    });
    return user ? 'emailExist' : 'emailNotExist';
  }

  public async getUsersByName(
    getUsersByNameDto: GetUsersByNameDto,
  ): Promise<User[]> {
    return await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.firstName', 'user.lastName', 'user.emailLogin'])
      .where('LOWER(user.firstName) LIKE LOWER(:name)', {
        name: `%${getUsersByNameDto.name}%`,
      })
      .orWhere('LOWER(user.lastName) LIKE LOWER(:name)', {
        name: `%${getUsersByNameDto.name}%`,
      })
      .orWhere('LOWER(user.emailLogin) LIKE LOWER(:name)', {
        name: `%${getUsersByNameDto.name}%`,
      })
      .limit(20)
      .getMany();
  }

  public async uploadFileToS3(file: Express.Multer.File): Promise<string> {
    const fileKey = `avatars/${uuidv4()}-${file.originalname}`;
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

  public async updateUserById(
    email: string,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ): Promise<User> {
    this.logger.log('Attempting to update user.');
    const user: User = await this.getUserByEmail(email);
    if (file) {
      updateUserDto.avatarUrl = await this.uploadFileToS3(file);
    }
    const { password, ...newUserData } = updateUserDto;
    if (password) {
      user.passHash = await bcrypt.hash(password, this.saltOrRounds);
      this.logger.log('Password hashed successfully for new user.');
    }
    Object.assign(user, newUserData);

    this.logger.log('Saving the new user to the database.');
    try {
      const updatedUser: User = await this.userRepository.save(user);
      this.logger.log(`Successfully updated user ${email}.`);
      return updatedUser;
    } catch (error) {
      this.logger.error(`Failed to update user ${email}`, error.stack);
      throw new InternalServerErrorException('Failed to update user.');
    }
  }

  public async removeUser(email: string): Promise<ResultMessage> {
    this.logger.log(`Deleting user ${email}.`);
    const user: User = await this.getUserByEmail(email);
    try {
      await this.userRepository.remove(user);
      this.logger.log('Successfully removed user from the database.');
      return {
        message: `The user was successfully deleted.`,
      };
    } catch (error) {
      this.logger.error(`Failed to remove user from the database`, error.stack);
      throw new InternalServerErrorException('Failed to remove user.');
    }
  }
}
