'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Route } from 'next';
import type { LucideIcon } from 'lucide-react';
import { LayoutGrid, Receipt, Tags, Settings } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface NavLinkProps {
  href: Route;
  children: React.ReactNode;
}

// Клиентская карта иконок: компонент-функцию нельзя передать пропом из
// серверного Sidebar в клиентский NavLink (граница Server/Client Components
// сериализует только простые данные), поэтому иконка выбирается здесь по href.
const navIcons: Record<string, LucideIcon> = {
  '/': LayoutGrid,
  '/expenses': Receipt,
  '/categories': Tags,
  '/settings': Settings,
};

export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
  const Icon = navIcons[href] ?? LayoutGrid;

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition',
        isActive
          ? 'bg-white font-medium text-[#1b1c21]'
          : 'text-white/60 hover:bg-white/10 hover:text-white',
      )}
    >
      <Icon className="size-[18px] shrink-0" strokeWidth={2} />
      {children}
    </Link>
  );
}
