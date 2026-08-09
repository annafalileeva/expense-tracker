import type { ExpenseDto } from '../model/types';
import { Table, Td, Th } from '@/shared/ui/table';
import { formatDate, formatMoney } from '@/shared/lib/format';

interface ExpenseTableProps {
  expenses: ExpenseDto[];
}

export function ExpenseTable({ expenses }: ExpenseTableProps) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
        Расходов пока нет
      </div>
    );
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th>Дата</Th>
          <Th>Категория</Th>
          <Th>Комментарий</Th>
          <Th className="text-right">Сумма</Th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense) => (
          <tr key={expense.id}>
            <Td>{formatDate(expense.spentAt)}</Td>
            <Td>{expense.category?.name ?? '—'}</Td>
            <Td className="text-muted-foreground">{expense.note ?? '—'}</Td>
            <Td className="text-right font-medium tabular-nums text-expense">
              {formatMoney(expense.amount, expense.currency)}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
