import type { ReactNode } from 'react';
import type { Route } from 'next';
import { navItems, siteConfig } from '@/shared/config/site';
import { NavLink } from './nav-link';

interface SidebarProps {
  userName?: string;
  /** Кнопка выхода — прокидывается извне, чтобы sidebar не зависел от features/auth. */
  logoutSlot?: ReactNode;
}

export function Sidebar({ userName, logoutSlot }: SidebarProps) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card p-4">
      <div className="mb-6 px-3 text-base font-semibold">{siteConfig.name}</div>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.href} href={item.href as Route}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      {userName ? (
        <div className="mt-6 space-y-2 border-t border-border pt-4">
          <p className="truncate px-3 text-sm text-muted-foreground">{userName}</p>
          {logoutSlot}
        </div>
      ) : null}
    </aside>
  );
}
