/*
 * Постоянный кэш DataForSEO.
 * Каждый успешный (оплаченный) ответ api.dataforseo.com сохраняется в таблицу ApiCache
 * и переиспользуется: повторный такой же запрос не тратит деньги.
 * Если API недоступен или отвечает ошибкой оплаты — отдаётся последний сохранённый ответ.
 *
 * .env:
 *   DATAFORSEO_OFFLINE=1   — вообще не ходить в API, только кэш (когда баланс пуст)
 *   DATAFORSEO_CACHE=0     — выключить кэш
 */

const DFS = "https://api.dataforseo.com/";
const DAY = 24 * 60 * 60 * 1000;

// Сколько ответ считается свежим. После — запрос идёт в API, но старый ответ остаётся запасным.
function ttlFor(endpoint: string): number {
  if (endpoint.includes("/serp/")) return 3 * DAY;
  if (endpoint.includes("/keywords_data/")) return 30 * DAY;
  if (endpoint.includes("/backlinks/")) return 14 * DAY;
  if (endpoint.includes("/dataforseo_labs/")) return 14 * DAY;
  if (endpoint.includes("/appendix/")) return 0;
  return 7 * DAY;
}

type Json = Record<string, unknown>;

function isOk(json: Json): boolean {
  if ([20000].includes(Number(json.status_code)) === false) return false;
  const tasks = Array.isArray(json.tasks) ? (json.tasks as Json[]) : [];
  return tasks.every((t) => Number(t.status_code) === 20000 || Number(t.status_code) === 40102);
}

function jsonResponse(json: Json, source: string): Response {
  return new Response(JSON.stringify(json), {
    status: 200,
    headers: { "content-type": "application/json", "x-dataforseo-cache": source },
  });
}

async function sha256(text: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(text).digest("hex");
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (process.env.DATAFORSEO_CACHE === "0") return;
  const g = globalThis as typeof globalThis & { __dfsCachePatched?: boolean };
  if (g.__dfsCachePatched) return;
  g.__dfsCachePatched = true;

  const { prisma } = await import("@/lib/prisma");
  const original = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async function cachedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith(DFS) === false) return original(input, init);

    const body = typeof init?.body === "string" ? init.body : "";
    if (init?.body && body === "") return original(input, init); // нестандартное тело — не кэшируем

    const endpoint = url.slice(DFS.length).split("?")[0];
    const ttl = ttlFor(endpoint);
    if (ttl === 0) return original(input, init);

    const key = await sha256(`${(init?.method ?? "GET").toUpperCase()} ${url}\n${body}`);
    let cached: { response: unknown; updatedAt: Date } | null = null;
    try {
      cached = await prisma.apiCache.findUnique({ where: { key }, select: { response: true, updatedAt: true } });
    } catch (e) {
      console.warn("[dataforseo cache] read failed:", (e as Error).message);
    }

    const fresh = cached ? Date.now() - cached.updatedAt.getTime() < ttl : false;
    if (cached && (fresh || process.env.DATAFORSEO_OFFLINE === "1")) {
      prisma.apiCache.update({ where: { key }, data: { hits: { increment: 1 } } }).catch(() => undefined);
      console.log(`[dataforseo] ${fresh ? "cache" : "offline-stale"}  ${endpoint}`);
      return jsonResponse(cached.response as Json, fresh ? "hit" : "stale");
    }

    if (process.env.DATAFORSEO_OFFLINE === "1") {
      console.log(`[dataforseo] offline-miss ${endpoint}`);
      return jsonResponse({ status_code: 40200, status_message: "Offline mode: no saved data for this request yet.", tasks: [] }, "miss");
    }

    let live: Response;
    try {
      live = await original(input, init);
    } catch (e) {
      if (cached) {
        console.log(`[dataforseo] network error, stale ${endpoint}`);
        return jsonResponse(cached.response as Json, "stale");
      }
      throw e;
    }

    let json: Json | null = null;
    try {
      json = (await live.clone().json()) as Json;
    } catch {
      return live;
    }

    if (json && isOk(json)) {
      const cost = Number(json.cost ?? 0) || 0;
      prisma.apiCache
        .upsert({
          where: { key },
          create: { key, endpoint, response: json as never, cost },
          update: { response: json as never, cost },
        })
        .catch((e: Error) => console.warn("[dataforseo cache] write failed:", e.message));
      console.log(`[dataforseo] live  ${endpoint}  $${cost.toFixed(4)} saved`);
      return jsonResponse(json, "live");
    }

    // ошибка оплаты / лимита / любая — отдаём последний сохранённый ответ, если он есть
    if (cached) {
      console.log(`[dataforseo] ${json?.status_message ?? live.status} -> stale ${endpoint}`);
      return jsonResponse(cached.response as Json, "stale");
    }
    return live;
  } as typeof fetch;
}
