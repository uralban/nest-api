import { Module } from '@nestjs/common';
import { AuthMeController } from './auth-me.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '../redis/redis.module';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './local.strategy';
import { UserService } from '../user/user.service';

@Module({
  controllers: [AuthMeController, AuthController],
  providers: [AuthService, UserService, JwtStrategy, LocalStrategy],
  imports: [
    RedisModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  exports: [AuthService, JwtStrategy, LocalStrategy, JwtModule],
})
export class AuthModule {}
