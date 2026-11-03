import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ScrollEffects from '@/components/ScrollEffects';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Pearl Connexions', template: '%s | Pearl Connexions' },
  description:
    'South London supported living for adults, with careful placement matching, practical life skills and progress reviewed together.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
        <ScrollEffects />
        <Analytics />
      </body>
    </html>
  );
}
