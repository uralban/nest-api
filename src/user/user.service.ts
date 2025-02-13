import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from '../global/dto/user/create-user.dto';
import { UpdateUserDto } from '../global/dto/user/update-user.dto';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { User } from './entities/user.entity';
import { AppService } from '../app.service';
import { InjectRepository } from '@nestjs/typeorm';
import { ResultMessage } from '../global/interfaces/result-message';
import * as bcrypt from 'bcrypt';
import { Role } from '../role/entities/role.entity';
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
import { TokenSet } from '../global/interfaces/token-set';
import { CustomTokenPayload } from '../global/interfaces/custom-token-payload';
import { LocalJwtService } from '../auth/local-jwt.service';
import { AuthService } from '../auth/auth.service';
import { AuthUserDto } from '../global/dto/user/auth-user.dto';

@Injectable()
export class UserService {
  private readonly logger: Logger = new Logger(AppService.name);
  private readonly saltOrRounds: string | number = 10;
  private s3: S3Client;
  private bucketName: string;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private configService: ConfigService,
    private localJwtService: LocalJwtService,
    private authService: AuthService,
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

    const { password, roleId, ...userData } = createUserDto;

    const hashedPassword: string = await bcrypt.hash(
      password,
      this.saltOrRounds,
    );
    this.logger.log('Password hashed successfully for new user.');

    const userRole: Role = await this.roleRepository.findOne({
      where: { id: roleId },
    });
    if (!userRole) {
      this.logger.error('Role not found.');
      throw new Error('Role not found.');
    }
    this.logger.log('Role found for new user.');

    const newUser: User = this.userRepository.create({
      ...userData,
      passHash: hashedPassword,
      role: userRole,
    });

    this.logger.log('Saving the new user to the database.');
    try {
      await this.userRepository.save(newUser);
      this.logger.log('Successfully created new user.');
      return;
    } catch (error) {
      this.logger.error('Error while saving user', error.stack);
    }
  }

  public async getAllUsers(
    pageOptionsDto: PaginationOptionsDto,
  ): Promise<PaginationDto<User>> {
    const queryBuilder: SelectQueryBuilder<User> =
      this.userRepository.createQueryBuilder('user');
    queryBuilder
      .leftJoinAndSelect('user.role', 'role')
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
      relations: {
        role: true,
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
      relations: {
        role: true,
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
    id: string,
    authTokens: TokenSet,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ): Promise<User> {
    this.logger.log('Attempting to update user.');

    const user: User = await this.getUserById(id);

    if (!this.checkEmailMatch(user.emailLogin, authTokens)) {
      this.logger.error('Authorization email is not match.');
      throw new UnauthorizedException(
        'Authorization failed for deleting this user.',
      );
    }

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
      this.logger.log(`Successfully updated user with ID: ${id}.`);
      return updatedUser;
    } catch (error) {
      this.logger.error(`Failed to update user with ID ${id}`, error.stack);
    }
  }

  public async removeUserById(
    id: string,
    authTokens: TokenSet,
  ): Promise<ResultMessage> {
    this.logger.log(`Deleting user by id ${id}.`);

    const user: User = await this.getUserById(id);

    if (!this.checkEmailMatch(user.emailLogin, authTokens)) {
      this.logger.error('Authorization email is not match.');
      throw new UnauthorizedException(
        'Authorization failed for deleting this user.',
      );
    }

    try {
      await this.userRepository.remove(user);
      this.logger.log('Successfully removed user from the database.');
      return {
        message: `The user was successfully deleted.`,
        executedId: id,
      };
    } catch (error) {
      this.logger.error(`Failed to remove user from the database`, error.stack);
    }
  }

  private checkEmailMatch(email: string, authTokens: TokenSet): boolean {
    let emailFromRequest: string;
    if (authTokens.accessToken) {
      const payload: CustomTokenPayload = this.localJwtService.verifyAccess(
        authTokens.accessToken,
      );
      emailFromRequest = payload.email;
    } else {
      const authUserDTo: AuthUserDto = this.authService.decodeLocalToken(
        authTokens.idToken,
      );
      emailFromRequest = authUserDTo.email;
    }
    return email === emailFromRequest;
  }
}
