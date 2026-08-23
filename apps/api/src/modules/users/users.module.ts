import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UsersController } from './users.controller';
import { UsersCommandHandlers } from './commands';
import { UsersQueryHandlers } from './queries';

/**
 * Nest-модуль пользователей: собирает контроллер и CQRS-хендлеры команд/запросов
 * фичи users (`/users/me`). Импортирует `CqrsModule` явно, так как в
 * `@nestjs/cqrs` v11 он не глобальный.
 */
@Module({
	imports: [CqrsModule],
	controllers: [UsersController],
	providers: [...UsersCommandHandlers, ...UsersQueryHandlers],
})
export class UsersModule {}
