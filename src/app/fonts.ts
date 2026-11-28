import { Geist_Mono, Inter_Tight } from "next/font/google";

/* Fonts of the public site (landing, pricing, product, blog), declared once and shared.
 * Display: a tight sans for big headlines, in the spirit of Linear; mono for small code-like labels. */
export const display = Inter_Tight({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-landing-display", display: "swap" });
export const mono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-landing-mono", display: "swap" });
