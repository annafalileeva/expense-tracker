import { Header } from '@/widgets/header';
import { ExpenseForm } from '@/features/expense/manage-expense';

// TODO: загрузить категории через listCategories() и подключить Server Action.
export function ExpenseNewPage() {
  return (
    <>
      <Header title="Новый расход" />
      <main className="p-6">
        <ExpenseForm categories={[]} />
      </main>
    </>
  );
}
