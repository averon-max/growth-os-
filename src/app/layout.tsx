import { SITE_URL } from "@/lib/site";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CookieNotice } from "@/components/cookie-notice";
import "./globals.css";
import "./geist.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Hyprlyx",
  title: "Hyprlyx: SEO Software for Keyword Research & Rank Tracking",
  description:
    "All-in-one SEO software: keyword research, rank tracking with Search Console, site audits, backlinks, competitor analysis, AI crawler tracking and an AI writer.",
  openGraph: { type: "website", siteName: "Hyprlyx", locale: "en_US" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: [{ url: "/favicon.ico?v=3", sizes: "any" }, { url: "/icon.png?v=3", type: "image/png" }],
    shortcut: "/favicon.ico?v=3",
    apple: "/apple-icon.png?v=3",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full antialiased ${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-geist-sans), -apple-system, sans-serif" }}>
        {children}
        <CookieNotice />
      </body>
    </html>
  );
}
