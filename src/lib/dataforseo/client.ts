export type Rec = Record<string, unknown>;
export const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
export const str = (v: unknown) => (typeof v === "string" ? v : null);
export const rec = (v: unknown): Rec => (v && typeof v === "object" ? (v as Rec) : {});

/** One DataForSEO live task. Returns task.result or throws with the provider message. */
export async function dfs(path: string, task: Rec): Promise<Rec[]> {
  const login = process.env.DATAFORSEO_LOGIN ?? "";
  const password = process.env.DATAFORSEO_PASSWORD ?? "";
  if (login === "" || password === "") throw new Error("DataForSEO credentials are not configured.");
  const res = await fetch(`https://api.dataforseo.com/v3/${path}`, {
    method: "POST",
    signal: AbortSignal.timeout(60000),
    headers: { Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`, "Content-Type": "application/json" },
    body: JSON.stringify([task]),
  });
  const json = rec(await res.json().catch(() => ({})));
  const t = rec(((json.tasks as Rec[] | undefined) ?? [])[0]);
  const code = num(t.status_code) ?? num(json.status_code) ?? 0;
  if (code >= 40000) throw new Error(str(t.status_message) ?? str(json.status_message) ?? `DataForSEO error ${code}`);
  return (t.result as Rec[] | undefined) ?? [];
}
