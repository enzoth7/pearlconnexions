import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Pearl Connexions', template: '%s | Pearl Connexions' },
  description:
    'Supported living, supported accommodation and children’s homes built around safety, connection and independence.',
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
        <Analytics />
      </body>
    </html>
  );
}
