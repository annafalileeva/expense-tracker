'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Route } from 'next';
import { cn } from '@/shared/lib/cn';

interface NavLinkProps {
  href: Route;
  children: React.ReactNode;
}

export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        'block rounded-md px-3 py-2 text-sm transition',
        isActive ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted',
      )}
    >
      {children}
    </Link>
  );
}
