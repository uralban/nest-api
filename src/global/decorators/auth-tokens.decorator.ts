import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TokenSet } from '../interfaces/token-set';

export const AuthTokens = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tokenSet: TokenSet = {};
    if (request.cookies?.access_token)
      tokenSet.accessToken = request.cookies?.access_token;
    if (request.headers['x-id-token'])
      tokenSet.idToken = request.headers['x-id-token'];
    return tokenSet;
  },
);
