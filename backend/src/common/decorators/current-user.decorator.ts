import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export class AuthenticatedUser {
  id!: string;
  email!: string;
  name!: string;
  role!: 'ADMIN' | 'CLIENT';
  isTrusted!: boolean;
  walletId?: string;
  apiKey?: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    return data ? user?.[data] : user;
  },
);
