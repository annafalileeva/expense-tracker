import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/ui/card';
import { formatMoney, formatMonth } from '@/shared/lib/format';
import type { CategoryTotal } from '@/entities/expense';

interface CategoryBreakdownProps {
  items: CategoryTotal[];
}

const FALLBACK_COLORS = ['#5b4fe8', '#dc5f3c', '#2f9e6e', '#d9a441'];

export function CategoryBreakdown({ items }: CategoryBreakdownProps) {
  const max = Math.max(...items.map((item) => item.total), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Расходы по категориям</CardTitle>
        <CardDescription className="capitalize">{formatMonth(new Date())}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Данных пока нет</p>
        ) : (
          <ul className="space-y-5">
            {items.map((item, index) => (
              <li key={item.id}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className="size-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          item.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
                      }}
                    />
                    {item.name}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatMoney(item.total)}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-muted">
                  <div
                    className="h-2.5 rounded-full transition-all"
                    style={{
                      width: `${(item.total / max) * 100}%`,
                      backgroundColor:
                        item.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
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
