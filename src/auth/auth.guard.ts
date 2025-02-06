import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard as AuthPassportGuard } from '@nestjs/passport';

@Injectable()
export class AuthGuard extends AuthPassportGuard(['jwt', 'local']) {
  handleRequest(err, user, info) {
    if (user) {
      return user;
    }
    throw err || new UnauthorizedException();
  }
}
