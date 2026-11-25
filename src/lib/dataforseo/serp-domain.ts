/*
 * Google now hides result links behind google.com/goto?url=… redirects, and DataForSEO then reports
 * "google.com" as the domain of every organic result. The real site is still in the breadcrumb
 * ("https://www.example.com › blog › post"), so the domain is read from there.
 */
type Rec = Record<string, unknown>;

const isGoogleRedirect = (u: string) => /^https?:\/\/(www\.)?google\.[a-z.]+\/(goto|url)\?/i.test(u);
const clean = (h: string) => h.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");

function hostFrom(text: string): string | null {
  const first = text.split("›")[0].trim();
  if (!first) return null;
  try {
    return clean(new URL(/^https?:\/\//i.test(first) ? first : `https://${first}`).hostname);
  } catch {
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(first) ? clean(first) : null;
  }
}

/** The real domain of an organic SERP item. */
export function serpDomain(x: Rec): string {
  const url = typeof x.url === "string" ? x.url : "";
  const domain = typeof x.domain === "string" ? clean(x.domain) : "";
  const redirected = isGoogleRedirect(url) || /^google\.[a-z.]+$/.test(domain);
  if (!redirected && domain) return domain;
  if (!redirected && url) { try { return clean(new URL(url).hostname); } catch { /* fall through */ } }
  for (const field of ["breadcrumb", "website_name", "source"]) {
    const v = x[field];
    if (typeof v === "string") {
      const h = hostFrom(v);
      if (h && !/^google\./.test(h)) return h;
    }
  }
  return domain;
}

/** A link a person can open: the real page when known, otherwise the Google redirect. */
export function serpUrl(x: Rec): string {
  const url = typeof x.url === "string" ? x.url : "";
  if (!isGoogleRedirect(url)) return url;
  const crumb = typeof x.breadcrumb === "string" ? x.breadcrumb : "";
  const parts = crumb.split("›").map((p) => p.trim()).filter(Boolean);
  const host = parts.length ? hostFrom(parts[0]) : null;
  if (!host) return url;
  const path = parts.slice(1).filter((p) => !p.includes("...") && !/\s/.test(p));
  return `https://${host}/${path.join("/")}`;
}
