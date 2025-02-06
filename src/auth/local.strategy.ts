import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { CustomTokenPayload } from '../global/interfaces/custom-token-payload';
import { AuthService } from './auth.service';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  private readonly logger: Logger = new Logger(LocalStrategy.name);

  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request.cookies['access_token'],
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(request: Request) {
    const response = request.res as Response;
    const accessToken: string = request.cookies['access_token'];
    const refreshToken: string = request.cookies['refresh_token'];

    if (!accessToken && !refreshToken) {
      throw new UnauthorizedException('No authorized');
    }

    try {
      const payload: CustomTokenPayload = this.jwtService.verify(accessToken);
      request.user = payload;
      const accessTokenIsValid: boolean =
        await this.authService.validateAccessToken(payload.email, accessToken);
      if (!accessTokenIsValid) {
        throw new UnauthorizedException('Authorization failed');
      }
      return true;
    } catch (error) {
      this.logger.error('Authorization failed. ', error);
      if (!refreshToken) {
        throw new UnauthorizedException('Authorization failed');
      }
    }

    try {
      const refreshPayload: CustomTokenPayload =
        this.jwtService.verify(refreshToken);
      const user: User = await this.userService.getUserByEmail(
        refreshPayload.email,
      );
      const refreshTokenIsValid: boolean =
        await this.authService.validateRefreshToken(
          user.emailLogin,
          refreshToken,
        );

      if (!refreshTokenIsValid) {
        throw new UnauthorizedException('Authorization failed');
      }

      const newAccessToken: string = this.jwtService.sign(
        { email: user.emailLogin },
        { expiresIn: '15m' },
      );
      const newRefreshToken: string = this.jwtService.sign(
        { email: user.emailLogin },
        { expiresIn: '7d' },
      );

      await this.authService.saveAccessToken(user.emailLogin, newAccessToken);
      await this.authService.updateRefreshToken(
        user.emailLogin,
        newRefreshToken,
      );

      response.cookie('access_token', newAccessToken, { httpOnly: true });
      response.cookie('refresh_token', newRefreshToken, { httpOnly: true });

      request.user = { email: user.emailLogin };
      return refreshPayload;
    } catch (error) {
      this.logger.error('Authorization failed. ', error);
      throw new UnauthorizedException('Authorization failed');
    }
  }
}
