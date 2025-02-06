import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auth } from './entities/auth.entity';
import { RedisService } from '../redis/redis.service';
import { AppService } from '../app.service';
import { User } from '../user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { Auth0UserDto } from '../global/dto/user/auth0-user.dto';
import { Role } from '../role/entities/role.entity';
import { CreateUserDto } from '../global/dto/user/create-user.dto';
import * as bcrypt from 'bcrypt';
import { TokenSet } from '../global/interfaces/token-set';
import { LoginDto } from '../global/dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger: Logger = new Logger(AppService.name);

  constructor(
    @InjectRepository(Auth)
    private refreshTokenRepository: Repository<Auth>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private redisService: RedisService,
    private jwtService: JwtService,
  ) {}

  public async saveAccessToken(
    userEmail: string,
    accessToken: string,
  ): Promise<void> {
    await this.redisService.set(`access_token:${userEmail}`, accessToken, 900);
  }

  public async getAccessToken(userEmail: string): Promise<string | null> {
    return this.redisService.get(`access_token:${userEmail}`);
  }

  public async deleteAccessToken(userEmail: string): Promise<void> {
    await this.redisService.del(`access_token:${userEmail}`);
  }

  public async saveRefreshToken(
    userEmail: string,
    refreshToken: string,
    user?: User,
  ): Promise<void> {
    const existAuth: Auth = await this.refreshTokenRepository.findOne({
      where: { user: { emailLogin: user.emailLogin } },
    });
    if (!existAuth) {
      const currentUser: User = user
        ? user
        : await this.getUserByEmail(userEmail);
      const newRefreshToken: Auth = this.refreshTokenRepository.create({
        refreshToken: refreshToken,
        user: currentUser,
      });
      try {
        await this.refreshTokenRepository.save(newRefreshToken);
        this.logger.log(`Successfully updated refresh token.`);
        return;
      } catch (error) {
        this.logger.error(`Failed to update Auth data`, error.stack);
      }
    }
    existAuth.refreshToken = refreshToken;
    await this.refreshTokenRepository.save(existAuth);
    return;
  }

  public async updateRefreshToken(
    userEmail: string,
    refreshToken: string,
  ): Promise<void> {
    const storedAuthData: Auth = await this.getAuthDataByEmail(userEmail);
    storedAuthData.refreshToken = refreshToken;
    await this.refreshTokenRepository.save(storedAuthData);
  }

  public async validateUser(loginDto: LoginDto): Promise<TokenSet> {
    const { email, password } = loginDto;
    const user: User = await this.getUserByEmail(email);
    const passCompareResult: boolean = await bcrypt.compare(
      password,
      user.passHash,
    );
    if (!passCompareResult) {
      this.logger.error('Password is incorrect.');
      throw new UnauthorizedException('Password is incorrect');
    }
    const accessToken: string = this.jwtService.sign(
      { email: user.emailLogin },
      { expiresIn: '15m' },
    );
    const refreshToken: string = this.jwtService.sign(
      { email: user.emailLogin },
      { expiresIn: '7d' },
    );

    await this.saveAccessToken(user.emailLogin, accessToken);
    await this.saveRefreshToken(user.emailLogin, refreshToken, user);
    return { accessToken: accessToken, refreshToken: refreshToken };
  }

  public async logoutUser(token: string): Promise<void> {
    const email: string = this.decodeIdToken(token).email;
    await this.deleteAccessToken(email);
    await this.deleteRefreshToken(email);
  }

  private async getAuthDataByEmail(userEmail: string): Promise<Auth> {
    const auth: Auth = await this.refreshTokenRepository.findOne({
      where: {
        user: await this.getUserByEmail(userEmail),
      },
      relations: {
        user: true,
      },
    });
    if (!auth) {
      this.logger.error('Refresh token not found.');
      throw new NotFoundException(`User has not any refresh token.`);
    } else {
      return auth;
    }
  }

  public async validateRefreshToken(
    email: string,
    refreshToken: string,
  ): Promise<boolean> {
    const storedAuthData: Auth = await this.getAuthDataByEmail(email);
    return storedAuthData.refreshToken === refreshToken;
  }

  public async validateAccessToken(
    email: string,
    accessToken: string,
  ): Promise<boolean> {
    const storedAccessToken: string = await this.getAccessToken(email);
    return storedAccessToken === accessToken;
  }

  public async deleteRefreshToken(userEmail: string): Promise<void> {
    const auth: Auth = await this.refreshTokenRepository.findOne({
      where: {
        user: { emailLogin: userEmail },
      },
    });
    if (!auth) {
      this.logger.error('Refresh token not found.');
      throw new NotFoundException(`User has not any refresh token.`);
    } else {
      await this.refreshTokenRepository.remove(auth);
    }
  }

  private async getUserByEmail(userEmail: string): Promise<User> {
    const user: User = await this.userRepository.findOne({
      where: { emailLogin: userEmail },
    });
    if (!user) {
      this.logger.error(`User with ${userEmail} email not found.`);
      throw new Error('User not found.');
    }
    return user;
  }

  private decodeIdToken(idToken: string) {
    try {
      return this.jwtService.decode(idToken);
    } catch (error) {
      this.logger.error('Decode token error. ', error);
      return null;
    }
  }

  public async getUserAfterLogin(idToken: string): Promise<User> {
    if (!idToken) {
      this.logger.error('ID Token not provided.');
      throw new Error('ID Token not provided');
    }
    const decodedIdToken: Auth0UserDto = this.decodeIdToken(idToken);
    this.logger.log('Check user exist.');
    const user: User = await this.userRepository.findOne({
      where: {
        emailLogin: decodedIdToken.email
          ? decodedIdToken.email
          : decodedIdToken.sub,
      },
      relations: {
        role: true,
      },
    });
    if (!user) {
      this.logger.warn('User not exist, adding user to the database.');
      const createUser: CreateUserDto = {
        emailLogin: decodedIdToken.email,
        firstName: decodedIdToken.given_name,
        lastName: decodedIdToken.family_name,
        password: '',
      };
      return this.createNewUserByAuth0(createUser);
    } else {
      this.logger.log('Return user to endpoint.');
      return user;
    }
  }

  private async createNewUserByAuth0(
    createUserDto: CreateUserDto,
  ): Promise<User> {
    this.logger.log('Attempting to create a new user.');
    const { password, ...userData } = createUserDto;
    const userRole: Role = await this.roleRepository.findOne({
      where: { roleName: 'user' },
    });
    if (!userRole) {
      this.logger.error('Role not found.');
      throw new Error('Role not found.');
    }
    this.logger.log('Role found for new user.');
    const newUser: User = this.userRepository.create({
      ...userData,
      passHash: password,
      role: userRole,
    });
    this.logger.log('Saving the new user to the database.');
    try {
      const user: User = await this.userRepository.save(newUser);
      this.logger.log('Successfully created new user.');
      return user;
    } catch (error) {
      this.logger.error('Error while saving user', error.stack);
    }
  }
}
