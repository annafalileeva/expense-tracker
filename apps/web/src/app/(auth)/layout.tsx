import { Wallet } from 'lucide-react';
import { siteConfig } from '@/shared/config/site';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-violet text-white">
          <Wallet className="size-[18px]" strokeWidth={2.25} />
        </div>
        <span className="font-display text-base font-semibold">{siteConfig.name}</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
