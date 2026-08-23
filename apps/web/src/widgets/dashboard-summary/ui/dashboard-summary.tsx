import type { LucideIcon } from 'lucide-react';
import { Wallet, Receipt, Calculator } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { formatMoney } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';

interface DashboardSummaryProps {
  total: number;
  count: number;
  average: number;
}

interface StatCardProps {
  icon: LucideIcon;
  tint: string;
  label: string;
  value: string;
}

function StatCard({ icon: Icon, tint, label, value }: StatCardProps) {
  return (
    <Card className="py-5">
      <CardContent className="px-5">
        <div className="flex items-center gap-3">
          <div
            className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', tint)}
          >
            <Icon className="size-[18px]" strokeWidth={2.25} />
          </div>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <p className="mt-4 font-display text-[26px] font-bold tracking-tight tabular-nums">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export function DashboardSummary({ total, count, average }: DashboardSummaryProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        icon={Wallet}
        tint="bg-violet/10 text-violet"
        label="Потрачено за месяц"
        value={formatMoney(total)}
      />
      <StatCard icon={Receipt} tint="bg-sand/15 text-sand" label="Операций" value={String(count)} />
      <StatCard
        icon={Calculator}
        tint="bg-income/10 text-income"
        label="Средний чек"
        value={formatMoney(average)}
      />
    </div>
  );
}
