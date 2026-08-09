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
