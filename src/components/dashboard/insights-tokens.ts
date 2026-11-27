/* Chart colours shared by server and client components (a "use client" module cannot export plain values to the server). */
export const PALETTE = ["#0090ff", "#e5484d", "#30a46c", "#8e4ec6", "#12a594", "#d6409f", "#f5a623"];
export const TONE = { good: "#30a46c", warn: "#f5a623", bad: "#e5484d", info: "#0090ff", muted: "#3a3a3a" } as const;
