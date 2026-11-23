import { SITE_URL } from "@/lib/site";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { CookieNotice } from "@/components/cookie-notice";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Hyprlyx — SEO intelligence for teams that ship fast.",
  description: "Hyprlyx crawls your website, detects what is holding back organic growth, and surfaces the highest-impact opportunities — with evidence, not guesses.",
  icons: {
    icon: [{ url: "/favicon.ico?v=3", sizes: "any" }, { url: "/icon.png?v=3", type: "image/png" }],
    shortcut: "/favicon.ico?v=3",
    apple: "/apple-icon.png?v=3",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable}`}>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-inter), -apple-system, sans-serif" }}>
        <Providers>{children}</Providers>
        <CookieNotice />
      </body>
    </html>
  );
}
