#!/usr/bin/env node
/**
 * Repository source inventory. Read-only: never deletes or rewrites project files.
 * Computes static module reachability; dynamic paths and external/manual callers need human review.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import ts from "typescript";

const root = process.cwd();
const rel = p => path.relative(root, p).split(path.sep).join("/");
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const files = tracked.filter(p => fs.existsSync(path.join(root, p)) && fs.statSync(path.join(root, p)).isFile());
const code = files.filter(p => /\.(?:tsx?|mts|mjs|js)$/.test(p));
const codeSet = new Set(code);
const candidatePaths = name => [
  name, name + ".ts", name + ".tsx", name + ".mts", name + ".js", name + ".mjs",
  name + ".json", name + ".css", name + "/index.ts", name + "/index.tsx", name + "/index.js",
];
function resolveImport(from, spec) {
  if (!spec.startsWith(".") && !spec.startsWith("@/")) return null;
  const base = spec.startsWith("@/") ? path.join(root, "src", spec.slice(2)) : path.resolve(root, path.dirname(from), spec);
  const target = candidatePaths(base).map(rel).find(p => codeSet.has(p));
  return target || null;
}
const edges = new Map(), inbound = new Map(), externalNames = new Map();
for (const f of code) {
  let text;
  try { text = fs.readFileSync(path.join(root, f), "utf8"); } catch { continue; }
  const kind = f.endsWith(".tsx") ? ts.ScriptKind.TSX : f.endsWith(".mjs") || f.endsWith(".js") ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const ast = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true, kind);
  const specs = [];
  const visit = n => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteralLike(n.moduleSpecifier)) {
      specs.push(n.moduleSpecifier.text);
    } else if (ts.isCallExpression(n) && n.arguments.length && ts.isStringLiteralLike(n.arguments[0]) &&
      (n.expression.kind === ts.SyntaxKind.ImportKeyword || n.expression.getText(ast) === "require")) {
      specs.push(n.arguments[0].text);
    }
    ts.forEachChild(n, visit);
  };
  visit(ast);
  const imports = [];
  for (const spec of specs) {
    const r = resolveImport(f, spec);
    if (r) { imports.push(r); inbound.set(r, (inbound.get(r) || 0) + 1); }
    else if (!spec.startsWith(".") && !spec.startsWith("@/")) externalNames.set(spec, (externalNames.get(spec) || 0) + 1);
  }
  edges.set(f, imports);
}
const allRuntime = code.filter(p => /^src\/app\/.*\/(page|route|layout|template|loading|error|not-found|global-error|default|sitemap|robots|manifest)\.(ts|tsx|js)$/.test(p) ||
  /^src\/app\/(page|layout|loading|error|not-found|global-error|sitemap|robots|manifest)\.(ts|tsx)$/.test(p) ||
  /^src\/(middleware|instrumentation)\.ts$/.test(p));
const tests = code.filter(p => /\.(test|spec)\.[cm]?[jt]sx?$/.test(p));
const scripts = code.filter(p => p.startsWith("scripts/") || p === "scripts-test-cloudflare.ts");
function reach(start) {
  const seen = new Set(), queue = [...start];
  for (let i = 0; i < queue.length; i++) {
    const f = queue[i]; if (seen.has(f)) continue;
    seen.add(f);
    for (const child of edges.get(f) || []) if (!seen.has(child)) queue.push(child);
  }
  return seen;
}
const runtime = reach(allRuntime), testReach = reach(tests), scriptReach = reach(scripts);
const source = code.filter(p => p.startsWith("src/") && !tests.includes(p));
const candidates = source.filter(p => !runtime.has(p) && !testReach.has(p) && !scriptReach.has(p));
const flagged = files.filter(p => /\.backup|\.bak|\/(?:\.growth-os-tmp|\.agents|\.windsurf|\.claude)\/|^cookies\d*\.txt$/.test(p));
const shaMap = new Map();
for (const p of files) {
  const value = fs.readFileSync(path.join(root, p));
  const sha = crypto.createHash("sha256").update(value).digest("hex");
  shaMap.set(sha, [...(shaMap.get(sha) || []), p]);
}
const duplicates = [...shaMap.values()].filter(a => a.length > 1);
const aiReferences = code.filter(p => {
  const s = fs.readFileSync(path.join(root, p), "utf8");
  return /\b(?:groq|gemini)\b|GROQ_|GEMINI_/i.test(s);
});
const report = {
  version: "GROWTH_OS_REPOSITORY_AUDIT_V1",
  gitHead: execFileSync("git", ["rev-parse", "HEAD"], {encoding:"utf8"}).trim(),
  count: { files: files.length, code: code.length, source: source.length, tests: tests.length,
    runtimeEntrypoints: allRuntime.length, scripts: scripts.length, runtimeReachable: runtime.size,
    testReachable: testReach.size, scriptReachable: scriptReach.size, unreferencedCandidates: candidates.length,
    backupsAndOldTooling: flagged.length, exactDuplicateGroups: duplicates.length, aiProviderReferences: aiReferences.length },
  flagged,
  staticUnreferencedCandidates: candidates,
  exactDuplicates: duplicates,
  aiProviderReferences: aiReferences,
  topExternalModules: [...externalNames].sort((a,b)=>b[1]-a[1]).slice(0,35),
  caveat: "Static imports only. An unreferenced candidate is NOT safe to delete without checking runtime discovery, Next conventions, scripts, tests and dynamic imports."
};
fs.mkdirSync(path.join(root, ".growth-os-tmp"), {recursive: true});
fs.writeFileSync(path.join(root, ".growth-os-tmp/repository-audit.json"), JSON.stringify(report,null,2)+"\n", {mode:0o600});
console.log("REPOSITORY_AUDIT_SUMMARY", JSON.stringify(report.count));
console.log("STATIC_UNREFERENCED_CANDIDATES", JSON.stringify(candidates.slice(0,90)));
console.log("PROVIDER_REFERENCE_FILES", JSON.stringify(aiReferences.slice(0,50)));
console.log("DUPLICATE_GROUPS", JSON.stringify(duplicates.slice(0,20)));
console.log("AUDIT_OUTPUT .growth-os-tmp/repository-audit.json");
