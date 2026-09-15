import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
export const metadata:Metadata={title:'Pearl Connexions | Supported Homes for Young People',description:'Supported homes helping young people build stability, confidence and independence.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
