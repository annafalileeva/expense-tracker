// Другие модули могут импортировать отсюда ТОЛЬКО классы команд
// (CreateUserCommand, UpdateUserCommand, DeleteUserCommand) — не handler'ы
// и не UsersCommandHandlers. Это регистрационный список для UsersModule.
export * from './create-user.command';
export * from './update-user.command';
export * from './delete-user.command';

import { CreateUserHandler } from './create-user.handler';
import { UpdateUserHandler } from './update-user.handler';
import { DeleteUserHandler } from './delete-user.handler';

export const UsersCommandHandlers = [CreateUserHandler, UpdateUserHandler, DeleteUserHandler];
