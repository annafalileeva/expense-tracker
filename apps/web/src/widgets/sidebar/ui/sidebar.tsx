import type { ReactNode } from 'react';
import type { Route } from 'next';
import { Wallet } from 'lucide-react';
import { navItems, siteConfig } from '@/shared/config/site';
import { NavLink } from './nav-link';

interface SidebarProps {
  userName?: string;
  /** Кнопка выхода — прокидывается извне, чтобы sidebar не зависел от features/auth. */
  logoutSlot?: ReactNode;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export function Sidebar({ userName, logoutSlot }: SidebarProps) {
  return (
    <aside className="sticky top-4 m-4 mr-0 flex h-[calc(100vh-2rem)] w-64 shrink-0 flex-col rounded-[2rem] bg-sidebar p-5">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-violet text-white">
          <Wallet className="size-5" strokeWidth={2.25} />
        </div>
        <span className="font-display text-[15px] font-semibold text-white">{siteConfig.name}</span>
      </div>

      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => (
          <NavLink key={item.href} href={item.href as Route}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {userName ? (
        <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 px-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
              {getInitials(userName)}
            </div>
            <p className="truncate text-sm text-white/80">{userName}</p>
          </div>
          {logoutSlot}
        </div>
      ) : null}
    </aside>
  );
}
