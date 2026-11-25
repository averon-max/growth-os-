/*
 * Every request to api.dataforseo.com goes through here.
 *
 * 1. Saved answers. A successful (paid) answer is stored in ApiCache and reused by everyone until it is older than
 *    the days set for its kind in Settings → Data. The same search is never paid for twice in that time,
 *    and identical requests running at the same moment share one paid call.
 * 2. Daily budget. Every paid call is logged in DfsSpend with its real cost. When today's total reaches the
 *    daily budget, no new paid calls are made: the last saved answer is used, or the caller gets a
 *    "balance" error and falls back to its free mode.
 * 3. Cheaper page reads. Reading a page with a full browser costs ~30× more than a plain read.
 *    A plain read is tried first; the browser is used only when the plain read comes back empty.
 * 4. Same question, same answer. "Best CRM", " best  crm" and {a,b} vs {b,a} are one saved answer, not three.
 * 5. Shorter Google results. Google results are billed per 10 rows, so 100 rows cost 10× more than 10.
 *    Requests are capped at DATAFORSEO_MAX_SERP_DEPTH rows (default 30), and a saved answer with more rows
 *    is reused for a request that needs fewer.
 *
 * .env:
 *   DATAFORSEO_OFFLINE=1        never call the API, only saved answers
 *   DATAFORSEO_CACHE=0          turn all of this off
 *   DATAFORSEO_DAILY_BUDGET=3   daily budget in USD
 *   DATAFORSEO_MAX_SERP_DEPTH=30  most Google result rows bought per search (10–100)
 */

const DFS = "https://api.dataforseo.com/";
const OPENAI = "https://api.openai.com/";
const SETTINGS_TTL = 60 * 1000;

type Json = Record<string, unknown>;

function isOk(json: Json): boolean {
  if (Number(json.status_code) !== 20000) return false;
  const tasks = Array.isArray(json.tasks) ? (json.tasks as Json[]) : [];
  return tasks.length > 0 && tasks.every((t) => Number(t.status_code) === 20000 || Number(t.status_code) === 40102);
}

function jsonResponse(json: Json, source: string): Response {
  return new Response(JSON.stringify(json), { status: 200, headers: { "content-type": "application/json", "x-dataforseo-cache": source } });
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const firstItem = (json: Json): Json | undefined => {
  const t = (json.tasks as Json[] | undefined)?.[0];
  const r = (t?.result as Json[] | undefined)?.[0];
  return (r?.items as Json[] | undefined)?.[0];
};

const SERP_DEPTHS = [10, 20, 30, 50, 100];
const maxSerpDepth = () => {
  const n = Math.round(Number(process.env.DATAFORSEO_MAX_SERP_DEPTH));
  return Number.isFinite(n) && n >= 10 && n <= 100 ? n : 30;
};

const tidy = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/** Same request written differently → same text: keys sorted, keywords trimmed and lowercased. */
function canonical(value: unknown, key = ""): unknown {
  if (Array.isArray(value)) return value.map((v) => canonical(v, key));
  if (value && typeof value === "object") {
    const o = value as Json;
    return Object.fromEntries(Object.keys(o).sort().map((k) => [k, canonical(o[k], k)]));
  }
  if (typeof value === "string" && (key === "keyword" || key === "keywords")) return tidy(value);
  return value;
}

/** The body to send and to key on: canonical, with Google result depth capped. */
function prepare(endpoint: string, body: string): { body: string; tasks: Json[] | null } {
  let tasks: unknown;
  try { tasks = JSON.parse(body); } catch { return { body, tasks: null }; }
  if (!Array.isArray(tasks)) return { body, tasks: null };
  const out = (canonical(tasks) as Json[]).map((t) => {
    if (!endpoint.startsWith("v3/serp/") || !t || typeof t !== "object") return t;
    const d = Number(t.depth);
    return Number.isFinite(d) && d > maxSerpDepth() ? { ...t, depth: maxSerpDepth() } : t;
  });
  return { body: JSON.stringify(out), tasks: out };
}

/** A saved Google answer with more rows, trimmed to the rows this request asked for. */
function trimSerp(json: Json, depth: number): Json {
  const tasks = (json.tasks as Json[] | undefined) ?? [];
  return {
    ...json,
    tasks: tasks.map((t) => ({
      ...t,
      result: ((t.result as Json[] | undefined) ?? []).map((r) => ({
        ...r,
        items: ((r.items as Json[] | undefined) ?? []).filter((i) => Number(i.rank_absolute ?? i.rank_group ?? 0) <= depth),
      })),
    })),
  };
}

/** For a page read with a browser: the same request without one, and how to tell if its answer is good enough. */
function cheaperPageRead(endpoint: string, body: string): { body: string; good: (json: Json) => boolean } | null {
  let tasks: Json[];
  try { tasks = JSON.parse(body) as Json[]; } catch { return null; }
  if (!Array.isArray(tasks) || tasks.length !== 1) return null;
  const task = tasks[0];
  if (endpoint === "v3/on_page/instant_pages" && (task.enable_browser_rendering === true || task.enable_javascript === true)) {
    const { enable_browser_rendering: _b, enable_javascript: _j, load_resources: _l, ...plain } = task;
    return {
      body: JSON.stringify([plain]),
      good: (json) => {
        const item = firstItem(json);
        if (!item) return false;
        const meta = (item.meta ?? {}) as Json;
        const words = Number(((meta.content ?? {}) as Json).plain_text_word_count ?? 0);
        const loc = typeof item.location === "string" ? item.location : "";
        return words >= 300 || (loc !== "" && /google\./i.test(loc) === false);
      },
    };
  }
  if (endpoint === "v3/on_page/content_parsing/live" && task.enable_javascript === true) {
    const { enable_javascript: _j, ...plain } = task;
    return {
      body: JSON.stringify([plain]),
      good: (json) => {
        const main = (((firstItem(json)?.page_content ?? {}) as Json).main_topic as unknown[] | undefined) ?? [];
        return main.length >= 2;
      },
    };
  }
  return null;
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (process.env.DATAFORSEO_CACHE === "0") return;
  const g = globalThis as typeof globalThis & { __dfsCachePatched?: boolean };
  if (g.__dfsCachePatched) return;
  g.__dfsCachePatched = true;

  const { prisma } = await import("@/lib/prisma");
  const { categoryOf, normalizeDfs, keepMs, SETTINGS_KEY } = await import("@/lib/dataforseo/cache-settings");
  const { wantsFresh } = await import("@/lib/dataforseo/fresh");
  const { AI_REUSE_HEADER, aiCost, usableAnswer, asReused } = await import("@/lib/ai/saved-answers");
  const original = globalThis.fetch.bind(globalThis);
  const inflight = new Map<string, Promise<Response>>();

  let settings = normalizeDfs(null);
  let settingsAt = 0;
  const getSettings = async () => {
    if (Date.now() - settingsAt < SETTINGS_TTL) return settings;
    try {
      const row = await prisma.appSetting.findUnique({ where: { key: SETTINGS_KEY } });
      settings = normalizeDfs(row?.value);
    } catch (e) {
      console.warn("[dataforseo] settings read failed:", (e as Error).message);
    }
    settingsAt = Date.now();
    return settings;
  };

  const today = () => new Date(new Date().toISOString().slice(0, 10));
  const spentToday = async () => {
    try {
      const r = await prisma.dfsSpend.aggregate({ where: { date: today(), NOT: { category: "ai" } }, _sum: { cost: true } });
      return r._sum.cost ?? 0;
    } catch {
      return 0;
    }
  };

  /** One paid request. Logs its cost. Never throws for a provider error — returns the JSON. */
  const paid = async (url: string, init: RequestInit, endpoint: string, body: string): Promise<{ res: Response; json: Json | null }> => {
    const res = await original(url, { ...init, body });
    let json: Json | null = null;
    try { json = (await res.clone().json()) as Json; } catch { json = null; }
    const cost = Number(json?.cost ?? 0) || 0;
    if (cost > 0) {
      await prisma.dfsSpend
        .upsert({
          where: { date_endpoint: { date: today(), endpoint } },
          create: { date: today(), endpoint, category: categoryOf(endpoint), calls: 1, cost },
          update: { calls: { increment: 1 }, cost: { increment: cost } },
        })
        .catch((e: Error) => console.warn("[dataforseo] spend log failed:", e.message));
    }
    console.log(`[dataforseo] paid  ${endpoint}  $${cost.toFixed(4)}`);
    return { res, json };
  };

  /*
   * OpenAI: every complete answer is saved (ApiCache, category "ai") with its approximate cost, so Settings → Data
   * shows it and can delete it. A saved answer is returned again only when the call carries the reuse header,
   * it is younger than the "AI answers" setting, and the same question was not already asked by this server in
   * the last 10 minutes (a repeat that soon is a retry and must reach the model).
   */
  const recentAi = new Map<string, number>();
  const aiFetch = async (url: string, input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const method = (init?.method ?? "GET").toUpperCase();
    const body = typeof init?.body === "string" ? init.body : null;
    if (method !== "POST" || body === null || (typeof input !== "string" && !(input instanceof URL))) return original(input, init);
    let request: Json;
    try { request = JSON.parse(body) as Json; } catch { return original(input, init); }
    if (request.stream === true) return original(input, init);

    const headers = new Headers(init?.headers);
    const reuse = headers.get(AI_REUSE_HEADER) === "1";
    headers.delete(AI_REUSE_HEADER);
    const endpoint = "openai/" + url.slice(OPENAI.length).split("?")[0].replace(/^v1\//, "");
    const model = typeof request.model === "string" ? request.model : "unknown";
    const key = await sha256(`AI ${endpoint}\n${body}`);
    recentAi.forEach((at, k) => { if (Date.now() - at > 600_000) recentAi.delete(k); });

    if (reuse && wantsFresh() === false && recentAi.has(key) === false) {
      const s = await getSettings();
      const row = await prisma.apiCache.findUnique({ where: { key }, select: { response: true, createdAt: true } }).catch(() => null);
      if (row && Date.now() - row.createdAt.getTime() < keepMs(s.days.ai)) {
        recentAi.set(key, Date.now());
        await prisma.apiCache.update({ where: { key }, data: { hits: { increment: 1 } } }).catch(() => undefined);
        console.log(`[openai] saved  ${endpoint}  ${model}`);
        return jsonResponse(asReused(row.response as Json), "hit");
      }
    }
    recentAi.set(key, Date.now());

    const res = await original(input, { ...init, headers });
    if (!res.ok) return res;
    let answer: Json | null = null;
    try { answer = (await res.clone().json()) as Json; } catch { answer = null; }
    if (answer && usableAnswer(request, answer)) {
      const cost = aiCost(model, answer.usage as Json | undefined);
      await Promise.all([
        prisma.apiCache.upsert({
          where: { key },
          create: { key, endpoint: `${endpoint}:${model}`, category: "ai", response: answer as never, cost },
          update: { response: answer as never, cost, category: "ai", createdAt: new Date() },
        }),
        prisma.dfsSpend.upsert({
          where: { date_endpoint: { date: today(), endpoint: `${endpoint}:${model}` } },
          create: { date: today(), endpoint: `${endpoint}:${model}`, category: "ai", calls: 1, cost },
          update: { calls: { increment: 1 }, cost: { increment: cost } },
        }),
      ]).catch((e: Error) => console.warn("[openai] save failed:", e.message));
    }
    return res;
  };

  globalThis.fetch = async function cachedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith(OPENAI)) return aiFetch(url, input, init);
    if (url.startsWith(DFS) === false) return original(input, init);

    const rawBody = typeof init?.body === "string" ? init.body : "";
    if (init?.body && rawBody === "") return original(input, init);
    const endpoint = url.slice(DFS.length).split("?")[0];
    if (endpoint.includes("/appendix/") || endpoint.includes("/user_data")) return original(input, init);
    const prepared = prepare(endpoint, rawBody);
    const body = prepared.body;

    const category = categoryOf(endpoint);
    const s = await getSettings();
    const ttl = keepMs(s.days[category]);
    const key = await sha256(`${(init?.method ?? "GET").toUpperCase()} ${url}\n${body}`);

    let cached: { response: unknown; createdAt: Date } | null = null;
    try {
      cached = await prisma.apiCache.findUnique({ where: { key }, select: { response: true, createdAt: true } });
    } catch (e) {
      console.warn("[dataforseo] cache read failed:", (e as Error).message);
    }
    // Answers saved before keys were made canonical are still used until they expire.
    if (cached === null && rawBody !== body) {
      const legacy = await sha256(`${(init?.method ?? "GET").toUpperCase()} ${url}\n${rawBody}`);
      cached = await prisma.apiCache.findUnique({ where: { key: legacy }, select: { response: true, createdAt: true } }).catch(() => null);
    }
    const fresh = cached !== null && wantsFresh() === false && Date.now() - cached.createdAt.getTime() < ttl;
    if (cached && (fresh || process.env.DATAFORSEO_OFFLINE === "1")) {
      await prisma.apiCache.update({ where: { key }, data: { hits: { increment: 1 } } }).catch(() => undefined);
      return jsonResponse(cached.response as Json, fresh ? "hit" : "stale");
    }

    // A fresh saved Google answer for the same search with more rows covers this one too.
    const single = prepared.tasks?.length === 1 ? prepared.tasks[0] : null;
    const depth = Number(single?.depth);
    if (endpoint.startsWith("v3/serp/") && single && Number.isFinite(depth) && wantsFresh() === false) {
      for (const bigger of SERP_DEPTHS.filter((d) => d > depth && d <= maxSerpDepth())) {
        const k = await sha256(`${(init?.method ?? "GET").toUpperCase()} ${url}\n${JSON.stringify([{ ...single, depth: bigger }])}`);
        const row = await prisma.apiCache.findUnique({ where: { key: k }, select: { response: true, createdAt: true } }).catch(() => null);
        if (row && Date.now() - row.createdAt.getTime() < ttl) {
          await prisma.apiCache.update({ where: { key: k }, data: { hits: { increment: 1 } } }).catch(() => undefined);
          return jsonResponse(trimSerp(row.response as Json, depth), "hit");
        }
      }
    }

    const running = inflight.get(key);
    if (running) return (await running).clone();

    const refuse = (message: string) =>
      cached ? jsonResponse(cached.response as Json, "stale") : jsonResponse({ status_code: 40200, status_message: message, cost: 0, tasks: [] }, "refused");
    if (process.env.DATAFORSEO_OFFLINE === "1") return refuse("Offline mode: no saved data for this request yet.");
    if (s.paused) return refuse("Paid data is paused in Settings → Data. Saved data is still shown.");
    const spent = await spentToday();
    if (spent >= s.dailyBudget) {
      console.warn(`[dataforseo] daily budget reached ($${spent.toFixed(2)} of $${s.dailyBudget}), refused ${endpoint}`);
      return refuse(`Daily data budget reached ($${s.dailyBudget}). Saved data is still shown; new data resumes tomorrow.`);
    }

    const work = (async (): Promise<Response> => {
      const req = { ...(init ?? {}), method: init?.method ?? "POST" };
      const cheaper = cheaperPageRead(endpoint, body);
      let result: { res: Response; json: Json | null } | null = null;
      if (cheaper) {
        const plain = await paid(url, req, endpoint, cheaper.body).catch(() => null);
        if (plain?.json && isOk(plain.json) && cheaper.good(plain.json)) result = plain;
      }
      result ??= await paid(url, req, endpoint, body);
      const { res, json } = result;
      if (json && isOk(json)) {
        const cost = Number(json.cost ?? 0) || 0;
        await prisma.apiCache
          .upsert({
            where: { key },
            create: { key, endpoint, category, response: json as never, cost },
            update: { response: json as never, cost, category, createdAt: new Date() },
          })
          .catch((e: Error) => console.warn("[dataforseo] cache write failed:", e.message));
        return jsonResponse(json, "live");
      }
      if (cached) return jsonResponse(cached.response as Json, "stale");
      return json ? jsonResponse(json, "error") : res;
    })();

    inflight.set(key, work.then((r) => r.clone()));
    try {
      return await work;
    } catch (e) {
      if (cached) return jsonResponse(cached.response as Json, "stale");
      throw e;
    } finally {
      setTimeout(() => inflight.delete(key), 1000);
    }
  } as typeof fetch;
}
