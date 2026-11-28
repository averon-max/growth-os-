/*
 * Big line icons for quiet pages (privacy, terms, cookies, support), like the column building
 * banks use: one drawing, thin strokes, no colour. Inline SVG, so no icon-library names to break.
 */
const PATHS = {
  // A classical building with columns: privacy (your data, kept safe).
  privacy: (
    <>
      <path d="M8 22 32 9l24 13" />
      <path d="M10 22h44" />
      <path d="M14 27v20M24 27v20M34 27v20M44 27v20M50 27v20" />
      <path d="M10 27h44M8 51h48M6 55h52" />
    </>
  ),
  // Scales: terms.
  terms: (
    <>
      <path d="M32 10v42M20 54h24M14 18h36" />
      <path d="M14 18 7 34h14zM50 18l-7 16h14z" />
      <path d="M7 34a7 4 0 0 0 14 0M43 34a7 4 0 0 0 14 0" />
    </>
  ),
  // A cookie: cookies.
  cookies: (
    <>
      <path d="M52 34A20 20 0 1 1 30 12a8 8 0 0 0 10 10 8 8 0 0 0 12 12Z" />
      <path d="M24 28h.01M30 40h.01M38 34h.01M22 42h.01" strokeWidth="4" />
    </>
  ),
  // A life buoy: support.
  support: (
    <>
      <circle cx="32" cy="32" r="20" />
      <circle cx="32" cy="32" r="8" />
      <path d="m18 18 8 8M46 18l-8 8M18 46l8-8M46 46l-8-8" />
    </>
  ),
} as const;

export type PageIconKind = keyof typeof PATHS;

export function PageIcon({ kind }: { kind: PageIconKind }) {
  return (
    <svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="#ededed" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "block", margin: "0 0 24px", opacity: 0.9 }}>
      {PATHS[kind]}
    </svg>
  );
}
