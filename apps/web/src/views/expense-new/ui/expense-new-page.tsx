import { Header } from '@/widgets/header';
import { listCategories } from '@/entities/category';
import { ExpenseForm } from '@/features/expense/manage-expense';

export async function ExpenseNewPage() {
  const categories = await listCategories();

  return (
    <>
      <Header title="Новый расход" />
      <main className="p-6">
        <ExpenseForm categories={categories} />
      </main>
    </>
  );
}
