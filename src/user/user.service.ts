import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from '../global/dto/user/create-user.dto';
import { UpdateUserDto } from '../global/dto/user/update-user.dto';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { User } from './entities/user.entity';
import { AppService } from '../app.service';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResultMessage } from '../global/interfaces/delete-result-message';
import * as bcrypt from 'bcrypt';
import { Role } from '../role/entities/role.entity';
import { PaginationOptionsDto } from '../global/dto/pagination-options.dto';
import { PaginationDto } from '../global/dto/pagination.dto';
import { PaginationMetaDto } from '../global/dto/pagination-meta.dto';

@Injectable()
export class UserService {
  private readonly logger: Logger = new Logger(AppService.name);
  private readonly saltOrRounds: string | number = 10;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

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
      .take(pageOptionsDto.take);

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

  public async updateUserById(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    this.logger.log('Attempting to create a new user.');

    const user: User = await this.getUserById(id);
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

  public async removeUserById(id: string): Promise<DeleteResultMessage> {
    this.logger.log(`Deleting user by id ${id}.`);

    const user: User = await this.getUserById(id);
    try {
      await this.userRepository.remove(user);
      this.logger.log('Successfully removed user from the database.');
      return {
        message: `User with ID ${id} successfully deleted.`,
        deletedId: id,
      };
    } catch (error) {
      this.logger.error(`Failed to remove user from the database`, error.stack);
    }
  }
}
