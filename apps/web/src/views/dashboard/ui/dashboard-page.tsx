import { Header } from '@/widgets/header';
import { CategoryBreakdown } from '@/widgets/category-breakdown';
import { DashboardSummary } from '@/widgets/dashboard-summary';

// TODO: заменить заглушки на агрегаты из API (GET /api/expenses с фильтром по месяцу).
export function DashboardPage() {
  return (
    <>
      <Header title="Дашборд" />
      <main className="space-y-6 p-6">
        <DashboardSummary total={0} count={0} average={0} />
        <CategoryBreakdown items={[]} />
      </main>
    </>
  );
}
