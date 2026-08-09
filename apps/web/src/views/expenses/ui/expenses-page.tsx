import { Header } from '@/widgets/header';
import { ExpenseFilters } from '@/features/expense/filter-expenses';
import { ExpenseTable } from '@/entities/expense';

// TODO: подставить listExpenses(searchParams) из entities/expense,
// когда появится авторизация и будет известен userId.
export function ExpensesPage() {
  return (
    <>
      <Header title="Расходы" />
      <main className="p-6">
        <ExpenseFilters categories={[]} />
        <ExpenseTable expenses={[]} />
      </main>
    </>
  );
}
