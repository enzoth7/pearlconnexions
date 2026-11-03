import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Pearl Connexions", template: "%s | Pearl Connexions" },
  description:
    "Private quality assurance, leadership workbook, finance and HR workspace for Pearl Connexions.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
