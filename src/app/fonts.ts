import { Geist_Mono, Newsreader } from "next/font/google";

/* Fonts of the public site (landing, pricing, product, blog), declared once and shared. */
export const display = Newsreader({ subsets: ["latin"], variable: "--font-landing-display", display: "swap" });
export const mono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-landing-mono", display: "swap" });
