import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { UserView } from '../../modules/users/queries';

/**
 * Текущий пользователь, положенный в request.user JwtStrategy'ей.
 * Доступен только под JwtAuthGuard (глобальный по умолчанию).
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): UserView => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return request.user as UserView;
});
