/* Chart colours shared by server and client components (a "use client" module cannot export plain values to the server). */
/*
 * Chart colours: a calm set of distinct hues (Radix dark step 9), always in this order, so a chart is easy to read
 * without looking like a rainbow. Meaning (good / warning / problem) still comes only from TONE and SEVERITY.
 */
export const PALETTE = ["#0090ff", "#e93d82", "#8e4ec6", "#f76b15", "#52a9ff", "#ff6369", "#a1a1a1"];
export const TONE = { good: "#30a46c", warn: "#ffb224", bad: "#e5484d", info: "#0090ff", muted: "#3a3a3a" } as const;
/** Issue severity, everywhere it is shown: red → orange → amber → grey (Vercel / Radix steps). */
export const SEVERITY = { critical: "#e5484d", high: "#f76b15", medium: "#ffb224", low: "#6b6b6b" } as const;
/** One accent for single-series charts (Vercel blue). */
export const ACCENT = "#0090ff";
