/* Chart colours shared by server and client components (a "use client" module cannot export plain values to the server). */
export const PALETTE = ["#0a84ff", "#d97706", "#0d9488", "#ec4899", "#16a34a", "#a855f7", "#f43f5e"];
export const TONE = { good: "#16a34a", warn: "#d97706", bad: "#f43f5e", info: "#0a84ff", muted: "#3a3a3a" } as const;
