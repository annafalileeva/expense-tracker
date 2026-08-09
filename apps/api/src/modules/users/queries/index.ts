// Другие модули могут импортировать отсюда классы запросов
// (GetUserByIdQuery, GetUserByEmailQuery) и типы результатов (UserView,
// UserWithCredentials) — не handler'ы и не UsersQueryHandlers.
export * from './get-user-by-id.query';
export * from './get-user-by-email.query';
export type { UserView, UserWithCredentials } from '../user.mapper';

import { GetUserByIdHandler } from './get-user-by-id.handler';
import { GetUserByEmailHandler } from './get-user-by-email.handler';

export const UsersQueryHandlers = [GetUserByIdHandler, GetUserByEmailHandler];
