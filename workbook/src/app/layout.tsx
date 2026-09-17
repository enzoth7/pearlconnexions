import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pearl Connexions | Leadership Workbook",
  description: "Leadership action management for Pearl Connexions — Where Every Connexion Counts",
  icons: {
    icon: [
      { url: "/Isotipo.png", type: "image/png" },
    ],
    shortcut: "/Isotipo.png",
    apple: "/Isotipo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

