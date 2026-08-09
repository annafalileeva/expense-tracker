import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ExpensesController } from './expenses.controller';
import { ExpensesCommandHandlers } from './commands';
import { ExpensesQueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [ExpensesController],
  providers: [...ExpensesCommandHandlers, ...ExpensesQueryHandlers],
})
export class ExpensesModule {}
