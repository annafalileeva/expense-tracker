import Link from 'next/link';
import { Header } from '@/widgets/header';
import { CategoryBreakdown } from '@/widgets/category-breakdown';
import { DashboardSummary } from '@/widgets/dashboard-summary';
import { UserProfile } from '@/widgets/user-profile';
import { PaginationBar } from '@/widgets/pagination';
import { getCurrentUser } from '@/entities/session';
import { listExpenses, summarizeExpenses, groupByCategory, ExpenseTable } from '@/entities/expense';
import { getMonthRange } from '@/shared/lib/date';
import { dashboardConfig } from '@/shared/config/site';

interface DashboardPageProps {
  page: number;
}

export async function DashboardPage({ page }: DashboardPageProps) {
  const [user, monthExpenses, recentExpenses] = await Promise.all([
    getCurrentUser(),
    // Ограничение: агрегаты считаются по первым summaryFetchLimit расходам месяца —
    // при большем объёме понадобится отдельный эндпоинт GET /api/expenses/summary.
    listExpenses({ ...getMonthRange(), limit: dashboardConfig.summaryFetchLimit }),
    listExpenses({ page, limit: dashboardConfig.recentExpensesLimit }),
  ]);

  const summary = summarizeExpenses(monthExpenses.items);
  const categoryTotals = groupByCategory(monthExpenses.items);

  return (
    <>
      <Header title="Расходы" />
      <main className="space-y-6 p-6">
        <UserProfile name={user.name} email={user.email} />
        <DashboardSummary total={summary.total} count={summary.count} average={summary.average} />
        <CategoryBreakdown items={categoryTotals} />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Последние транзакции</h2>
            <Link href="/expenses" className="text-sm text-primary hover:underline">
              Все расходы →
            </Link>
          </div>
          <ExpenseTable expenses={recentExpenses.items} />
          <PaginationBar
            page={recentExpenses.page}
            total={recentExpenses.total}
            limit={recentExpenses.limit}
            basePath="/"
          />
        </div>
      </main>
    </>
  );
}
