import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { LocalJwtService } from '../auth/local-jwt.service';
import { RedisService } from '../redis/redis.service';
import { Socket } from 'socket.io';
import { UserService } from '../user/user.service';
import { User } from '../user/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(
    private authService: AuthService,
    private localJwtService: LocalJwtService,
    private redisService: RedisService,
    private userService: UserService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const accessToken: string = this.getCookie(
      client.handshake.headers.cookie,
      'access_token',
    );
    const refreshToken: string = this.getCookie(
      client.handshake.headers.cookie,
      'refresh_token',
    );
    const auth0Token: string = client.handshake.auth.token?.slice(7);

    if (!accessToken && !refreshToken && !auth0Token) {
      this.logger.warn('No tokens provided');
      client.disconnect();
      throw new UnauthorizedException('No tokens provided');
    }

    if (auth0Token) {
      try {
        const payload = await this.verifyAuth0Token(auth0Token);
        client.data.user = payload;
        return true;
      } catch (error) {
        this.logger.warn('Invalid Auth0 token', error);
        client.disconnect();
        throw new UnauthorizedException('Invalid Auth0 token');
      }
    }

    try {
      const payload = this.localJwtService.verifyAccess(accessToken);
      const accessTokenIsValid: boolean =
        await this.authService.validateAccessToken(payload.email, accessToken);

      if (!accessTokenIsValid) {
        this.logger.warn('Invalid access token');
        client.disconnect();
        throw new UnauthorizedException('Invalid access token');
      }

      client.data.user = payload;
      return true;
    } catch (error) {
      this.logger.warn('Access token invalid or expired. Trying refresh...');

      if (!refreshToken) {
        this.logger.warn('No refresh token provided');
        client.disconnect();
        throw new UnauthorizedException('No refresh token provided');
      }

      return await this.refreshTokens(client, refreshToken);
    }
  }

  private async refreshTokens(
    client: Socket,
    refreshToken: string,
  ): Promise<boolean> {
    try {
      const refreshPayload = this.localJwtService.verifyRefresh(refreshToken);
      const user: User = await this.userService.getUserByEmail(
        refreshPayload.email,
      );

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const refreshTokenIsValid: boolean =
        await this.authService.validateRefreshToken(
          user.emailLogin,
          refreshToken,
        );

      if (!refreshTokenIsValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newAccessToken: string = this.localJwtService.signAccess(
        { email: user.emailLogin },
        '15m',
      );
      const newRefreshToken: string = this.localJwtService.signRefresh(
        { email: user.emailLogin },
        '7d',
      );

      await this.redisService.set(user.emailLogin, newAccessToken, 900);
      await this.authService.updateRefreshToken(
        user.emailLogin,
        newRefreshToken,
      );

      client.handshake.headers.cookie = `access_token=${newAccessToken}; refresh_token=${newRefreshToken}`;

      this.logger.log(`Tokens refreshed for user: ${user.emailLogin}`);

      client.data.user = { email: user.emailLogin };
      return true;
    } catch (error) {
      this.logger.error('Failed to refresh tokens:', error.message);
      throw new UnauthorizedException('Token refresh failed');
    }
  }

  private getCookie(cookies: string, name: string): string | null {
    const match = cookies?.match(new RegExp(`${name}=([^;]+)`));
    return match ? match[1] : null;
  }

  private async verifyAuth0Token(token: string): Promise<any> {
    const jwksMyClient = jwksClient({
      jwksUri: `https://${this.configService.get('AUTH0_DOMAIN')}/.well-known/jwks.json`,
    });

    const getKey = (header, callback) => {
      jwksMyClient.getSigningKey(header.kid, (err, key) => {
        if (err) {
          this.logger.error('Failed to get signing key:', err);
          return callback(err);
        }
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
      });
    };

    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        {
          audience: this.configService.get('AUTH0_AUDIENCE'),
          issuer: `https://${this.configService.get<string>('AUTH0_DOMAIN')}/`,
          algorithms: ['RS256'],
        },
        (err, decoded) => {
          if (err) {
            this.logger.warn('Auth0 token verification failed:', err.message);
            return reject(err);
          }
          resolve(decoded);
        },
      );
    });
  }
}
