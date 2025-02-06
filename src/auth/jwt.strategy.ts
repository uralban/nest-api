import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import * as jwksClient from 'jwks-rsa';
import { CustomTokenPayload } from '../global/interfaces/custom-token-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private jwksClient;

  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: async (request, rawJwtToken, done) => {
        try {
          const decodedHeader: any = JSON.parse(
            Buffer.from(rawJwtToken.split('.')[0], 'base64').toString(),
          );
          if (!decodedHeader.kid)
            throw new UnauthorizedException('Invalid token header');
          const key: string = await this.getSigningKey(decodedHeader.kid);
          done(null, key);
        } catch (error) {
          done(error, null);
        }
      },
      algorithms: ['RS256'],
    });
    this.jwksClient = jwksClient({
      jwksUri: `https://${this.configService.get('AUTH0_DOMAIN')}/.well-known/jwks.json`,
    });
  }

  private async getSigningKey(kid: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.jwksClient.getSigningKey(kid, (err, key) => {
        if (err) {
          reject(new UnauthorizedException('Could not get signing key'));
        } else {
          resolve(key.getPublicKey());
        }
      });
    });
  }

  public async validate(payload: any): Promise<CustomTokenPayload> {
    return { sub: payload.email };
  }
}
