import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUserEmail = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return user['https://www.mental-help.com.ua/email'] || user.email;
  },
);
