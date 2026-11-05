// Runs the writer once per article template and writes one scoreboard, so we can see which formats
// reach 9/10 and which do not. Every run is a separate process (the logger is per process).
//   npx --yes tsx scripts/run-writer-matrix.ts                      all 15 templates
//   npx --yes tsx scripts/run-writer-matrix.ts comparison pricing   only these templates
//   npx --yes tsx scripts/run-writer-matrix.ts --kw "Heat Pump vs Furnace" --kw "Moving Checklist"
// MATRIX_CONCURRENCY (default 2) runs at once; MATRIX_TIMEOUT_MIN (default 45) per run.
import fs from "fs";
import path from "path";
import { spawn, spawnSync } from "child_process";

export const DEFAULT_KEYWORDS: [string, string][] = [
  ["how-to", "How to Change a Car Tire Safely"],
  ["definition", "What Is a Heat Pump"],
  ["comparison", "Heat Pump vs Furnace"],
  ["pricing", "How Much Does a Roof Replacement Cost"],
  ["troubleshooting", "Why Does My Car Battery Keep Dying"],
  ["best-options", "Best Budget Robot Vacuum"],
  ["checklist", "Moving Checklist"],
  ["statistics", "Remote Work Statistics"],
  ["how-it-works", "How Do Solar Panels Work"],
  ["alternatives", "Mailchimp Alternatives"],
  ["review", "Instant Pot Duo Review"],
  ["benefits-risks", "Pros and Cons of Solar Panels"],
  ["beginners-guide", "Composting for Beginners"],
  ["case-study", "Airbnb Growth Case Study"],
  ["industry-analysis", "Electric Vehicle Market Trends"],
];

const SUMMARY = ["PAGES_SUMMARY", "AUTHORITY_SOURCES", "FORMAT_CONTRACT", "PROCEDURE_PLAN", "PROCEDURE_ORDER", "PROCEDURE_ORDER_FIXED", "PROCEDURE_FEASIBILITY", "TOOLS_COVERAGE", "FORMAT_CHECK", "EVIDENCE_CONTRACT", "EVIDENCE_RECOVERY", "CHECK_FAILED", "EDITORIAL_SCORECARD", "EDITORIAL_SCORECARD_REPAIR", "EDITORIAL_SCORECARD_PARTIAL_ROLLBACK", "EDITORIAL_SCORECARD_REVERTED", "EDITORIAL_FINAL_CHECK", "EDITORIAL_SCORECARD_RESULT", "EDITORIAL_NON_REGRESSION", "FAQ_BLOCKS_DROPPED", "QUALITY_GATE", "PUBLICATION_READINESS", "USAGE_REPORT"];

export interface MatrixResult {
  template: string;
  keyword: string;
  detected: string | null;
  h1: string;
  scoreBefore: number | null;
  score: number | null;
  scores: Record<string, number> | null;
  status: string;
  reasons: string[];
  openCritical: { id: string; source?: string; section: string; problem: string }[];
  formatGaps: string[];
  words: number;
  serpAvg: number | null;
  minutes: number;
  md: string;
  summary: string;
  error?: string;
}

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), f);
    if (fs.existsSync(p) === false) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m === null || process.env[m[1]] !== undefined) continue;
      let v = m[2];
      if (/^".*"$|^'.*'$/.test(v)) v = v.slice(1, -1);
      else v = v.replace(/\s+#.*$/, "");
      process.env[m[1]] = v;
    }
  }
}
const pick = (...names: string[]) => names.map((n) => process.env[n]).find((v) => typeof v === "string" && v.trim() !== "");

/** One run in this process: article + summary + result JSON next to the log. */
export async function runWorker(template: string, keyword: string): Promise<string> {
  loadEnv();
  const login = pick("DATAFORSEO_LOGIN", "DATAFORSEO_USERNAME", "DATAFORSEO_USER", "DATAFORSEO_EMAIL", "DATA_FOR_SEO_LOGIN", "DFS_LOGIN");
  const password = pick("DATAFORSEO_PASSWORD", "DATAFORSEO_PASS", "DATAFORSEO_API_PASSWORD", "DATA_FOR_SEO_PASSWORD", "DFS_PASSWORD");
  const openAiKey = pick("OPENAI_API_KEY");
  if (login === undefined || password === undefined || openAiKey === undefined) throw new Error(`missing credentials (login: ${login !== undefined}, password: ${password !== undefined}, openai: ${openAiKey !== undefined}); values are never printed`);
  const { runWriter } = await import("../src/lib/writer/orchestrator");
  const t0 = Date.now();
  const out = await runWriter({ seedKeyword: keyword, category: (template === "custom" ? "definition" : template) as never, dataForSeoLogin: login, dataForSeoPassword: password, openAiKey, exactKeyword: true });
  const minutes = Math.round(((Date.now() - t0) / 60000) * 10) / 10;
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const base = out.logFile.replace(/\.jsonl$/, `-${stamp}`);
  fs.writeFileSync(`${base}.md`, `# ${out.article.h1}\n\nMeta: ${out.article.metaDescription}\n\n${out.article.bodyMarkdown}\n`);
  const lines = fs.readFileSync(out.logFile, "utf8").trim().split("\n");
  const start = lines.map((l, i) => (l.includes('"event":"PIPELINE_START"') ? i : -1)).filter((i) => i >= 0).pop() ?? 0;
  const events: { step?: string; event: string; data: Record<string, unknown> }[] = [];
  for (const l of lines.slice(start)) { try { events.push(JSON.parse(l)); } catch { /* partial line */ } }
  const ev = (name: string) => events.filter((e) => e.event === name).map((e) => e.data);
  const summary: string[] = [];
  for (const e of events) {
    if (SUMMARY.includes(e.event) === false) continue;
    const d = e.data;
    const compact = e.event === "EVIDENCE_CONTRACT" ? { pages: d.pages, summary: d.summary }
      : e.event === "EDITORIAL_SCORECARD" ? { round: d.round, overall: d.overall, scores: d.scores, issues: d.issues, openCritical: Array.isArray(d.openCritical) ? d.openCritical.length : 0 }
      : d;
    summary.push(`${e.event} ${JSON.stringify(compact).slice(0, 2500)}`);
  }
  summary.push(`TOTAL ${minutes} min, ${out.article.totalWordCount} words`);
  fs.writeFileSync(`${base}-summary.txt`, summary.join("\n") + "\n");
  const gate = ev("QUALITY_GATE")[0] ?? {};
  const start0 = events.find((e) => e.event === "START" && e.step === "article-writer")?.data ?? {}; // serp-analyzer and keyword-picker log START too
  const r = out.readiness;
  const res = ev("EDITORIAL_SCORECARD_RESULT")[0] ?? {};
  const result: MatrixResult = {
    template, keyword,
    detected: typeof start0.category === "string" ? start0.category : null,
    h1: out.article.h1,
    scoreBefore: typeof gate.editorialScoreBefore === "number" ? gate.editorialScoreBefore : null,
    score: typeof gate.editorialScore === "number" ? gate.editorialScore : null,
    scores: (gate.scores as Record<string, number>) ?? null,
    status: r?.status ?? "UNKNOWN",
    reasons: r?.reasons ?? [],
    openCritical: r?.openCritical ?? [],
    formatGaps: ((res.codeGaps ?? []) as { section: string; problem: string }[]).map((g) => `${g.section}: ${g.problem}`),
    words: out.article.totalWordCount,
    serpAvg: typeof start0.serpAvgWordCount === "number" ? start0.serpAvgWordCount : null,
    minutes,
    md: `${base}.md`,
    summary: `${base}-summary.txt`,
  };
  fs.writeFileSync(`${base}-result.json`, JSON.stringify(result, null, 2));
  return `${base}-result.json`;
}

const fmt = (n: number | null) => (n === null ? "–" : String(n));

export function scoreboard(results: MatrixResult[], title: string): string {
  const rows = results.map((r, i) => `| ${i + 1} | ${r.template} | ${r.detected ?? "–"} | ${r.keyword} | ${fmt(r.scoreBefore)} → ${fmt(r.score)} | ${r.error ? `FAILED: ${r.error.slice(0, 60)}` : r.status} | ${r.openCritical.length ? r.openCritical.map((e) => `${e.id} ${e.source ?? "scorecard"}`).join(", ") : "–"} | ${r.formatGaps.length || "–"} | ${r.words} (${fmt(r.serpAvg)}) | ${r.minutes} |`);
  const scored = results.filter((r) => r.score !== null);
  const avg = scored.length ? Math.round((scored.reduce((n, r) => n + (r.score ?? 0), 0) / scored.length) * 10) / 10 : null;
  const below = scored.filter((r) => (r.score ?? 0) < 9).map((r) => `${r.template} ${r.score}`);
  const details = results.map((r) => {
    const weakest = r.scores ? Object.entries(r.scores).filter(([, v]) => v < 9).map(([k, v]) => `${k} ${v}`).join(", ") : "";
    return [`### ${r.template} — ${r.keyword}`, `- Detected format: ${r.detected ?? "–"}; H1: ${r.h1}`, `- Score ${fmt(r.scoreBefore)} → ${fmt(r.score)}${weakest ? ` (below 9: ${weakest})` : ""}; ${r.status}`,
      ...(r.error ? [`- Error: ${r.error}`] : []), ...r.reasons.slice(0, 6).map((x) => `- Reason: ${x}`), ...r.formatGaps.map((g) => `- Format gap: ${g}`), `- Files: ${r.md} | ${r.summary}`].join("\n");
  }).join("\n\n");
  return `# ${title}\n\n| # | Template | Detected | Keyword | Score | Readiness | Open critical | Format gaps | Words (SERP avg) | Min |\n|---|---|---|---|---|---|---|---|---|---|\n${rows.join("\n")}\n\nAverage final score: ${fmt(avg)}; below 9: ${below.join(", ") || "none"}; READY: ${results.filter((r) => r.status === "READY").length}/${results.length}\n\n## Details\n\n${details}\n`;
}

async function parent(args: string[]) {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const custom: [string, string][] = [];
  const only: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--kw" && args[i + 1]) custom.push(["custom", args[++i]]);
    else only.push(args[i]);
  }
  const unknown = only.filter((t) => DEFAULT_KEYWORDS.every(([k]) => k !== t));
  if (unknown.length) { console.error(`Unknown template(s): ${unknown.join(", ")}. Known: ${DEFAULT_KEYWORDS.map(([k]) => k).join(", ")}`); process.exit(1); }
  const jobs = [...(only.length ? DEFAULT_KEYWORDS.filter(([k]) => only.includes(k)) : custom.length ? [] : DEFAULT_KEYWORDS), ...custom];
  const concurrency = Math.max(1, Number(process.env.MATRIX_CONCURRENCY ?? 2));
  const timeoutMs = Number(process.env.MATRIX_TIMEOUT_MIN ?? 45) * 60000;
  const dir = path.join(process.cwd(), "writer-logs", `matrix-${stamp}`);
  fs.mkdirSync(dir, { recursive: true });
  const [cmd, ...cmdArgs] = (process.env.MATRIX_CHILD_CMD ?? "npx --yes tsx").split(" ");
  const script = process.env.MATRIX_CHILD_SCRIPT ?? process.argv[1];
  console.log(`${jobs.length} runs, ${concurrency} at a time; console logs in ${dir}`);
  const results: MatrixResult[] = new Array(jobs.length);
  let next = 0, done = 0;
  const runOne = (idx: number) => new Promise<void>((resolve) => {
    const [template, keyword] = jobs[idx];
    const t0 = Date.now();
    const logPath = path.join(dir, `${String(idx + 1).padStart(2, "0")}-${template}.log`);
    const logStream = fs.createWriteStream(logPath);
    const child = spawn(cmd, [...cmdArgs, script, "--worker", template, keyword], { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let resultFile = "";
    let tail = "";
    child.stdout.on("data", (b: Buffer) => { const t = b.toString(); logStream.write(t); tail = (tail + t).slice(-4000); const m = tail.match(/MATRIX_RESULT (.+\.json)/); if (m) resultFile = m[1].trim(); });
    child.stderr.on("data", (b: Buffer) => { logStream.write(b); tail = (tail + b.toString()).slice(-4000); });
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
    child.on("close", (code) => {
      clearTimeout(timer);
      logStream.end();
      const minutes = Math.round(((Date.now() - t0) / 60000) * 10) / 10;
      let r: MatrixResult;
      try { r = JSON.parse(fs.readFileSync(resultFile, "utf8")); }
      catch {
        const err = (tail.match(/WRITER FAILED:.*|Error:.*/)?.[0] ?? `exit code ${code}${Date.now() - t0 >= timeoutMs ? " (timeout)" : ""}`).slice(0, 300);
        r = { template, keyword, detected: null, h1: "", scoreBefore: null, score: null, scores: null, status: "FAILED", reasons: [], openCritical: [], formatGaps: [], words: 0, serpAvg: null, minutes, md: "", summary: logPath, error: err };
      }
      results[idx] = r;
      done++;
      console.log(`[${done}/${jobs.length}] ${template.padEnd(17)} ${fmt(r.scoreBefore)} -> ${fmt(r.score)}  ${r.error ? `FAILED (${r.error.slice(0, 80)})` : r.status}  ${r.minutes} min  ${keyword}`);
      resolve();
    });
  });
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, async () => { while (next < jobs.length) await runOne(next++); }));
  const title = `Writer matrix ${stamp} (${jobs.length} runs)`;
  const board = scoreboard(results, title);
  const boardPath = path.join(process.cwd(), "writer-logs", `matrix-${stamp}.md`);
  fs.writeFileSync(boardPath, board);
  // one file to send back: scoreboard + every summary + every article
  const all = [board, ...results.map((r) => `\n===== ${r.template}: ${r.keyword} =====\n${r.summary && fs.existsSync(r.summary) ? fs.readFileSync(r.summary, "utf8") : ""}\n----- ARTICLE -----\n${r.md && fs.existsSync(r.md) ? fs.readFileSync(r.md, "utf8") : "(no article)"}`)].join("\n");
  const allPath = path.join(process.cwd(), "writer-logs", `matrix-${stamp}-all.txt`);
  fs.writeFileSync(allPath, all);
  console.log(`\n${board}\nSCOREBOARD: ${boardPath}\nSEND THIS FILE: ${allPath}`);
  if (process.platform === "darwin" && process.env.MATRIX_NO_OPEN === undefined) spawnSync("open", ["-R", allPath]);
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--worker") {
    const file = await runWorker(args[1], args[2]);
    console.log(`MATRIX_RESULT ${file}`);
    return;
  }
  loadEnv();
  await parent(args);
}

if (process.env.MATRIX_NO_MAIN === undefined) {
  main().catch((e) => {
    console.error("WRITER FAILED:", e instanceof Error ? e.stack ?? e.message : e);
    process.exit(1);
  });
}
