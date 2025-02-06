import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LocalJwtService {
  constructor(
    private readonly jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  public signAccess(payload: any, expiresIn?: string): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET_LOCAL_ACCESS'),
      expiresIn: expiresIn ? expiresIn : '15m',
    });
  }

  public signRefresh(payload: any, expiresIn?: string): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET_LOCAL_REFRESH'),
      expiresIn: expiresIn ? expiresIn : '15m',
    });
  }

  public verifyAccess(token: string): any {
    return this.jwtService.verify(token, {
      secret: this.configService.get('JWT_SECRET_LOCAL_ACCESS'),
    });
  }

  public verifyRefresh(token: string): any {
    return this.jwtService.verify(token, {
      secret: this.configService.get('JWT_SECRET_LOCAL_REFRESH'),
    });
  }

  public decode(token: string): any {
    return this.jwtService.decode(token);
  }
}
