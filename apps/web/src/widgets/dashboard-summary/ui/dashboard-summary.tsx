import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { formatMoney } from '@/shared/lib/format';

interface DashboardSummaryProps {
  total: number;
  count: number;
  average: number;
}

export function DashboardSummary({ total, count, average }: DashboardSummaryProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Потрачено за месяц
          </CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold tabular-nums">
          {formatMoney(total)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Операций</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold tabular-nums">{count}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Средний чек</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold tabular-nums">
          {formatMoney(average)}
        </CardContent>
      </Card>
    </div>
  );
}
