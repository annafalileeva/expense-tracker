// Другие модули импортируют отсюда только классы команд, не handler'ы.
export * from './create-expense.command';
export * from './update-expense.command';
export * from './delete-expense.command';

import { CreateExpenseHandler } from './create-expense.handler';
import { UpdateExpenseHandler } from './update-expense.handler';
import { DeleteExpenseHandler } from './delete-expense.handler';

export const ExpensesCommandHandlers = [
  CreateExpenseHandler,
  UpdateExpenseHandler,
  DeleteExpenseHandler,
];
