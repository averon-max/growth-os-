/* Chart colours shared by server and client components (a "use client" module cannot export plain values to the server). */
/*
 * One calm look on every page: categories are shades of Vercel blue and greys, not a rainbow.
 * Colour that means something (good / warning / problem) comes only from TONE and SEVERITY.
 */
export const PALETTE = ["#0090ff", "#52a9ff", "#0b68cb", "#9ccaff", "#8f8f8f", "#5a5a5a", "#3a3a3a"];
export const TONE = { good: "#30a46c", warn: "#ffb224", bad: "#e5484d", info: "#0090ff", muted: "#3a3a3a" } as const;
/** Issue severity, everywhere it is shown: red → orange → amber → grey (Vercel / Radix steps). */
export const SEVERITY = { critical: "#e5484d", high: "#f76b15", medium: "#ffb224", low: "#6b6b6b" } as const;
/** One accent for single-series charts (Vercel blue). */
export const ACCENT = "#0090ff";
