import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ExpensesController } from './expenses.controller';
import { ExpensesCommandHandlers } from './commands';
import { ExpensesQueryHandlers } from './queries';

/**
 * Nest-модуль расходов: собирает контроллер и CQRS-хендлеры команд/запросов
 * фичи expenses. Импортирует `CqrsModule` явно, так как в `@nestjs/cqrs` v11
 * он не глобальный.
 */
@Module({
  imports: [CqrsModule],
  controllers: [ExpensesController],
  providers: [...ExpensesCommandHandlers, ...ExpensesQueryHandlers],
})
export class ExpensesModule {}
