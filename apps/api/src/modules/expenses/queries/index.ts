export * from './list-expenses.query';
export * from './get-expense.query';

import { ListExpensesHandler } from './list-expenses.handler';
import { GetExpenseHandler } from './get-expense.handler';

export const ExpensesQueryHandlers = [ListExpensesHandler, GetExpenseHandler];
