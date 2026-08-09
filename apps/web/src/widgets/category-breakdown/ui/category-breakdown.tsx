import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { formatMoney } from '@/shared/lib/format';
import type { CategoryTotal } from '@/entities/expense';

interface CategoryBreakdownProps {
  items: CategoryTotal[];
}

export function CategoryBreakdown({ items }: CategoryBreakdownProps) {
  const max = Math.max(...items.map((item) => item.total), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Расходы по категориям
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Данных пока нет</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{item.name}</span>
                  <span className="tabular-nums">{formatMoney(item.total)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{
                      width: `${(item.total / max) * 100}%`,
                      backgroundColor: item.color ?? undefined,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
