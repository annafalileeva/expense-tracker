export const siteConfig = {
  name: 'Трекер расходов',
  description: 'Учёт личных трат по категориям',
  defaultCurrency: 'RUB',
  defaultLocale: 'ru-RU',
} as const;

export const navItems = [
  { href: '/', label: 'Дашборд' },
  { href: '/expenses', label: 'Расходы' },
  { href: '/categories', label: 'Категории' },
  { href: '/settings', label: 'Настройки' },
] as const;

export const dashboardConfig = {
  recentExpensesLimit: 10,
  /** Потолок, который пропускает @Max(100) в PaginationQueryDto на бэкенде. */
  summaryFetchLimit: 100,
} as const;
