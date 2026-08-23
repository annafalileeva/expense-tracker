import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Header } from '@/widgets/header';
import { CategoryBreakdown } from '@/widgets/category-breakdown';
import { DashboardSummary } from '@/widgets/dashboard-summary';
import { PaginationBar } from '@/widgets/pagination';
import { Button } from '@/shared/ui/button';
import { getCurrentUser } from '@/entities/session';
import { listExpenses, summarizeExpenses, groupByCategory, ExpenseTable } from '@/entities/expense';
import { getMonthRange } from '@/shared/lib/date';
import { dashboardConfig } from '@/shared/config/site';

interface DashboardPageProps {
  page: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 6) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
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
  const firstName = user.name.split(' ')[0] ?? user.name;

  return (
    <>
      <Header
        title={`${getGreeting()}, ${firstName}`}
        description="Следите за расходами и держите бюджет под контролем."
        action={
          <Link href="/expenses/new">
            <Button size="lg">
              <Plus className="size-4" />
              Добавить расход
            </Button>
          </Link>
        }
      />
      <main className="space-y-6 p-8 pt-6">
        <DashboardSummary total={summary.total} count={summary.count} average={summary.average} />
        <CategoryBreakdown items={categoryTotals} />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Последние транзакции</h2>
            <Link href="/expenses" className="text-sm font-medium text-violet hover:underline">
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
