export interface DateRange {
  from: string;
  to: string;
}

export function getMonthRange(date: Date = new Date()): DateRange {
  const from = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

  return { from: from.toISOString(), to: to.toISOString() };
}
