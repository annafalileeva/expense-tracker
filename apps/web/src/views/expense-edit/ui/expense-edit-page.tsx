import { Header } from '@/widgets/header';
import { ExpenseForm } from '@/features/expense/manage-expense';

interface ExpenseEditPageProps {
  id: string;
}

// TODO: загрузить расход через getExpense(id) и категории через listCategories().
export function ExpenseEditPage({ id }: ExpenseEditPageProps) {
  return (
    <>
      <Header title="Редактирование расхода" />
      <main className="p-6">
        <p className="mb-4 text-sm text-muted-foreground">ID: {id}</p>
        <ExpenseForm categories={[]} />
      </main>
    </>
  );
}
