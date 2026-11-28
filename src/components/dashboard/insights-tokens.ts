/* Chart colours shared by server and client components (a "use client" module cannot export plain values to the server). */
/*
 * Chart colours: a calm set of distinct hues (Radix dark step 9), always in this order, so a chart is easy to read
 * without looking like a rainbow. Meaning (good / warning / problem) still comes only from TONE and SEVERITY.
 */
export const PALETTE = ["#0090ff", "#9ccaff", "#0b5cad", "#d6eaff", "#4d8fd6", "#6e7f96", "#a0a5ae"]; // one blue family, no purple or pink
export const TONE = { good: "#30a46c", warn: "#ffb224", bad: "#e5484d", info: "#0090ff", muted: "#3e3e44" } as const;
/** Issue severity, everywhere it is shown: red → orange → amber → grey (Vercel / Radix steps). */
export const SEVERITY = { critical: "#e5484d", high: "#f76b15", medium: "#ffb224", low: "#62666d" } as const;
/** One accent for single-series charts (Vercel blue). */
export const ACCENT = "#0090ff";
