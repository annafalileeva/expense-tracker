import type { Metadata } from 'next';
import { Inter, Onest } from 'next/font/google';
import { siteConfig } from '@/shared/config/site';
import './globals.css';

const bodyFont = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-body',
});

const headingFont = Onest({
  subsets: ['latin', 'cyrillic'],
  weight: ['600', '700', '800'],
  variable: '--font-heading',
});

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${bodyFont.variable} ${headingFont.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
