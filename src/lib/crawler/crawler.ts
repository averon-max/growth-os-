import { isSafeUrl, isSameDomain, normalizeUrl } from "./security";
import { parsePage, ParsedPage } from "./parser";

export interface CrawledPage {
  url: string;
  statusCode: number;
  contentType: string;
  responseTime: number;
  depth: number;
  parsed: ParsedPage | null;
  error?: string;
  redirectedFrom?: string;
}

interface CrawlerOptions {
  maxPages?: number;
  maxDepth?: number;
  timeoutMs?: number;
  maxResponseSize?: number;
  concurrency?: number;
}

const DEFAULT_OPTIONS: Required<CrawlerOptions> = {
  maxPages: 25,
  maxDepth: 4,
  timeoutMs: 12000,
  maxResponseSize: 5 * 1024 * 1024,
  concurrency: 3,
};

async function fetchPage(
  url: string,
  timeoutMs: number,
  maxResponseSize: number,
  startUrl: string
): Promise<CrawledPage> {
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let finalUrl = url;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SignalBot/1.0 (SEO Analysis; +https://signal.app)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });

    clearTimeout(timer);

    finalUrl = response.url || url;

    // Validate redirect target is safe and same domain
    if (finalUrl !== url) {
      const safeCheck = await isSafeUrl(finalUrl);
      if (!safeCheck.safe) {
        return {
          url,
          statusCode: 0,
          contentType: "",
          responseTime: Date.now() - start,
          depth: 0,
          parsed: null,
          error: `Redirect to unsafe URL: ${safeCheck.reason}`,
          redirectedFrom: url,
        };
      }
      if (!isSameDomain(startUrl, finalUrl)) {
        return {
          url,
          statusCode: response.status,
          contentType: "",
          responseTime: Date.now() - start,
          depth: 0,
          parsed: null,
          error: "Redirect left domain",
          redirectedFrom: url,
        };
      }
    }

    const statusCode = response.status;
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      return {
        url: finalUrl,
        statusCode,
        contentType,
        responseTime: Date.now() - start,
        depth: 0,
        parsed: null,
        error: `HTTP ${statusCode}`,
        redirectedFrom: finalUrl !== url ? url : undefined,
      };
    }

    if (!contentType.includes("text/html")) {
      return {
        url: finalUrl,
        statusCode,
        contentType,
        responseTime: Date.now() - start,
        depth: 0,
        parsed: null,
        redirectedFrom: finalUrl !== url ? url : undefined,
      };
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxResponseSize) {
      return {
        url: finalUrl,
        statusCode,
        contentType,
        responseTime: Date.now() - start,
        depth: 0,
        parsed: null,
        error: "Response too large",
        redirectedFrom: finalUrl !== url ? url : undefined,
      };
    }

    const html = new TextDecoder().decode(buffer);
    const parsed = parsePage(html, finalUrl);

    return {
      url: finalUrl,
      statusCode,
      contentType,
      responseTime: Date.now() - start,
      depth: 0,
      parsed,
      redirectedFrom: finalUrl !== url ? url : undefined,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isTimeout = message.includes("abort") || message.includes("AbortError");
    return {
      url,
      statusCode: 0,
      contentType: "",
      responseTime: Date.now() - start,
      depth: 0,
      parsed: null,
      error: isTimeout ? "Timeout" : message,
    };
  }
}

export async function crawlWebsite(
  startUrl: string,
  options: CrawlerOptions = {}
): Promise<CrawledPage[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { maxPages, maxDepth, timeoutMs, maxResponseSize, concurrency } = opts;

  // Validate and normalize start URL
  const normalizedStart = normalizeUrl(startUrl);
  if (!normalizedStart) throw new Error("Invalid start URL");

  const safeCheck = await isSafeUrl(normalizedStart);
  if (!safeCheck.safe) throw new Error(`URL failed security check: ${safeCheck.reason}`);

  const visited = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [{ url: normalizedStart, depth: 0 }];
  visited.add(normalizedStart);

  const results: CrawledPage[] = [];

  console.log(`[crawler] Starting crawl: ${normalizedStart}`);

  while (queue.length > 0 && results.length < maxPages) {
    // Take up to `concurrency` items from queue
    const batch = queue.splice(0, Math.min(concurrency, maxPages - results.length));

    const batchResults = await Promise.all(
      batch.map(async ({ url, depth }) => {
        console.log(`[crawler] Fetching (depth=${depth}): ${url}`);
        const page = await fetchPage(url, timeoutMs, maxResponseSize, normalizedStart);
        page.depth = depth;
        return { page, depth };
      })
    );

    for (const { page, depth } of batchResults) {
      results.push(page);

      if (!page.parsed || depth >= maxDepth) continue;

      for (const link of page.parsed.internalLinks) {
        const normalized = normalizeUrl(link);
        if (!normalized) continue;
        if (visited.has(normalized)) continue;
        if (!isSameDomain(normalizedStart, normalized)) continue;
        if (results.length + queue.length >= maxPages) break;

        // Quick safety check without full DNS (already on same domain)
        visited.add(normalized);
        queue.push({ url: normalized, depth: depth + 1 });
      }
    }
  }

  console.log(`[crawler] Completed: ${results.length} pages crawled`);
  return results;
}
