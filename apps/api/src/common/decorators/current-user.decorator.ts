import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { UserView } from '../../modules/users/queries';

/**
 * Параметр-декоратор, возвращающий текущего пользователя, положенного в
 * `request.user` стратегией `JwtStrategy`. Доступен только под
 * `JwtAuthGuard` (глобальный по умолчанию); на `@Public()`-маршрутах
 * `request.user` не заполнен.
 *
 * @param _data - конфигурация декоратора (не используется).
 * @param ctx - контекст выполнения запроса Nest.
 * @returns `UserView` текущего пользователя из `request.user`.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): UserView => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return request.user as UserView;
});
