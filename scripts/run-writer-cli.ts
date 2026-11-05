// Runs the Growth OS writer from the terminal (no browser, no server needed),
// saves the article as .md next to its log and prints the readiness summary.
// Usage: npx --yes tsx scripts/run-writer-cli.ts "How to Change a Car Tire Safely"
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

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
const pick = (...names: string[]) => names.map((n) => process.env[n]).find((v) => typeof v === "string" && v.trim() !== "");
const login = pick("DATAFORSEO_LOGIN", "DATAFORSEO_USERNAME", "DATAFORSEO_USER", "DATAFORSEO_EMAIL", "DATA_FOR_SEO_LOGIN", "DFS_LOGIN");
const password = pick("DATAFORSEO_PASSWORD", "DATAFORSEO_PASS", "DATAFORSEO_API_PASSWORD", "DATA_FOR_SEO_PASSWORD", "DFS_PASSWORD");
const openAiKey = pick("OPENAI_API_KEY");

const SUMMARY = ["PAGES_SUMMARY", "AUTHORITY_SOURCES", "PROCEDURE_PLAN", "PROCEDURE_ORDER", "PROCEDURE_ORDER_FIXED", "PROCEDURE_FEASIBILITY", "TOOLS_COVERAGE", "EVIDENCE_CONTRACT", "EVIDENCE_RECOVERY", "CHECK_FAILED", "EDITORIAL_SCORECARD", "EDITORIAL_SCORECARD_REPAIR", "EDITORIAL_SCORECARD_PARTIAL_ROLLBACK", "EDITORIAL_SCORECARD_REVERTED", "EDITORIAL_FINAL_CHECK", "EDITORIAL_SCORECARD_RESULT", "QUALITY_GATE", "PUBLICATION_READINESS", "USAGE_REPORT"];

async function main() {
  if (login === undefined || password === undefined || openAiKey === undefined) {
    const names = Object.keys(process.env).filter((k) => /dataforseo|data_for_seo|dfs|openai/i.test(k));
    console.error(`Missing credentials (login: ${login !== undefined}, password: ${password !== undefined}, openai: ${openAiKey !== undefined}). Env names found, values hidden: ${names.join(", ") || "(none)"}`);
    process.exit(1);
  }
  const keyword = process.argv[2] ?? "How to Change a Car Tire Safely";
  const { runWriter } = await import("../src/lib/writer/orchestrator");
  // keep the terminal readable: one line per pipeline event instead of the full JSON
  const origLog = console.log;
  console.log = (first?: unknown, ...rest: unknown[]) => {
    if (typeof first === "string" && /^\[[a-z-]+\] [A-Z_:0-9]+$/.test(first)) origLog(`${new Date().toLocaleTimeString()} ${first}`);
    else origLog(first, ...rest);
  };
  const t0 = Date.now();
  let out: Awaited<ReturnType<typeof runWriter>>;
  try {
    out = await runWriter({ seedKeyword: keyword, category: "definition", dataForSeoLogin: login, dataForSeoPassword: password, openAiKey, exactKeyword: true });
  } finally {
    console.log = origLog;
  }
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const base = out.logFile.replace(/\.jsonl$/, `-${stamp}`);
  fs.writeFileSync(`${base}.md`, `# ${out.article.h1}\n\nMeta: ${out.article.metaDescription}\n\n${out.article.bodyMarkdown}\n`);
  // only this run: the log file also holds earlier runs of the same keyword and day
  const lines = fs.readFileSync(out.logFile, "utf8").trim().split("\n");
  const start = lines.map((l, i) => (l.includes('"event":"PIPELINE_START"') ? i : -1)).filter((i) => i >= 0).pop() ?? 0;
  const summary: string[] = [];
  for (const l of lines.slice(start)) {
    let e: { event: string; data: Record<string, unknown> };
    try { e = JSON.parse(l); } catch { continue; }
    if (SUMMARY.includes(e.event) === false) continue;
    const d = e.data;
    const compact = e.event === "EVIDENCE_CONTRACT" ? { pages: d.pages, summary: d.summary }
      : e.event === "EDITORIAL_SCORECARD" ? { round: d.round, overall: d.overall, scores: d.scores, issues: Array.isArray(d.issues) ? d.issues.length : 0, openCritical: Array.isArray(d.openCritical) ? d.openCritical.length : 0 }
      : d;
    summary.push(`${e.event} ${JSON.stringify(compact).slice(0, 1500)}`);
  }
  summary.push(`TOTAL ${Math.round(((Date.now() - t0) / 60000) * 10) / 10} min, ${out.article.totalWordCount} words`);
  fs.writeFileSync(`${base}-summary.txt`, summary.join("\n") + "\n");
  console.log("\n" + summary.join("\n"));
  console.log(`\nARTICLE: ${base}.md\nSUMMARY: ${base}-summary.txt`);
  if (process.platform === "darwin") spawnSync("open", ["-R", `${base}.md`]); // show both files in Finder
}

main().catch((e) => {
  console.error("WRITER FAILED:", e instanceof Error ? e.stack ?? e.message : e);
  process.exit(1);
});
