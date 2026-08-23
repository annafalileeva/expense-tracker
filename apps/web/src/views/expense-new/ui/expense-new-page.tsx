import { Header } from '@/widgets/header';
import { listCategories } from '@/entities/category';
import { ExpenseForm } from '@/features/expense/manage-expense';

export async function ExpenseNewPage() {
  const categories = await listCategories();

  return (
    <>
      <Header title="Новый расход" description="Заполните детали, чтобы записать трату." />
      <main className="p-8 pt-6">
        <ExpenseForm categories={categories} />
      </main>
    </>
  );
}
