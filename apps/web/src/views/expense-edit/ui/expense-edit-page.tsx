import { Header } from '@/widgets/header';
import { listCategories } from '@/entities/category';
import { getExpense } from '@/entities/expense';
import { ExpenseForm } from '@/features/expense/manage-expense';

interface ExpenseEditPageProps {
  id: string;
}

export async function ExpenseEditPage({ id }: ExpenseEditPageProps) {
  const [categories, expense] = await Promise.all([listCategories(), getExpense(id)]);

  return (
    <>
      <Header title="Редактирование расхода" />
      <main className="p-6">
        <ExpenseForm categories={categories} expense={expense} />
      </main>
    </>
  );
}
