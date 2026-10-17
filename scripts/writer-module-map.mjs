#!/usr/bin/env node
/**
 * Read-only Content/Writer module dependency map.
 *
 * Inspect ALL tracked TS/TSX/JS files for static ESM, exports, require()
 * and literal dynamic import() edges. Classify by framework/API reachability,
 * not by filename alone. No files are ever deleted by this report.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import ts from "typescript";

const cwd = process.cwd();
const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0").filter(Boolean);
const code = paths.filter(p => /\.(?:[cm]?[jt]sx?)$/.test(p) &&
  fs.existsSync(path.join(cwd, p)) &&
  fs.statSync(path.join(cwd, p)).isFile());
const codeSet = new Set(code);
const local = p => path.relative(cwd, p).split(path.sep).join("/");
const candidatePaths = p => [
  p, p + ".ts", p + ".tsx", p + ".js", p + ".jsx",
  p + ".mjs", p + ".mts", p + ".cjs", p + ".cts",
  p + "/index.ts", p + "/index.tsx", p + "/index.js",
];
function resolve(from, spec) {
  if (!(spec.startsWith("@/") || spec.startsWith("."))) return null;
  const abs = spec.startsWith("@/")
    ? path.join(cwd, "src", spec.slice(2))
    : path.resolve(cwd, path.dirname(from), spec);
  return candidatePaths(abs).map(local).find(p => codeSet.has(p)) ?? null;
}
const edges = new Map(), importers = new Map(), fileStats = new Map();
for (const p of code) {
  const source = fs.readFileSync(path.join(cwd, p), "utf8");
  const ast = ts.createSourceFile(p, source, ts.ScriptTarget.Latest, true,
    p.endsWith(".tsx") || p.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const imports = new Set();
  const add = spec => {
    const resolved = resolve(p, spec);
    if (!resolved) return;
    imports.add(resolved);
    if (!importers.has(resolved)) importers.set(resolved, new Set());
    importers.get(resolved).add(p);
  };
  const visit = n => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
      n.moduleSpecifier && ts.isStringLiteralLike(n.moduleSpecifier)) {
      add(n.moduleSpecifier.text);
    }
    if (ts.isCallExpression(n) && n.arguments.length &&
      ts.isStringLiteralLike(n.arguments[0]) &&
      (n.expression.kind === ts.SyntaxKind.ImportKeyword ||
       n.expression.getText(ast) === "require")) {
      add(n.arguments[0].text);
    }
    ts.forEachChild(n, visit);
  };
  visit(ast);
  edges.set(p, [...imports].sort());
  fileStats.set(p, {
    bytes: Buffer.byteLength(source, "utf8"),
    lines: source.split("\n").length,
    exports: ast.statements
      .filter(s => s.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword))
      .map(s => s.name?.getText(ast) ??
        (s.kind === ts.SyntaxKind.ExportDeclaration
          ? (s.moduleSpecifier?.getText(ast) ?? "reexport")
          : "anonymous-export"))
      .slice(0, 30),
  });
}
const isTest = p => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(p) ||
  p.includes("/__tests__/") || p.includes("/__mocks__/");
const isRoute = p => /^src\/app\/(.+\/)?(?:page|layout|route|template|default|error|not-found|loading|sitemap|robots|manifest)\.[jt]sx?$/.test(p) ||
  /^src\/(?:middleware|instrumentation)\.[jt]s$/.test(p);
const productionEntrypoints = code.filter(isRoute);
const testEntrypoints = code.filter(isTest);
const scriptEntrypoints = code.filter(p => p.startsWith("scripts/"));
const writerEntrypoints = code.filter(p =>
  p === "src/lib/content/service.ts" ||
  /^src\/app\/api\/content\//.test(p) && p.endsWith("/route.ts"));
function reach(roots) {
  const visited = new Set(), queue = [...roots];
  for (let i = 0; i < queue.length; i++) {
    const name = queue[i];
    if (visited.has(name)) continue;
    visited.add(name);
    for (const child of edges.get(name) ?? []) if (!visited.has(child)) queue.push(child);
  }
  return visited;
}
const runtime = reach(productionEntrypoints);
const writer = reach(writerEntrypoints);
const tests = reach(testEntrypoints);
const scripts = reach(scriptEntrypoints);
const inContent = p => p.startsWith("src/lib/content/");
const content = code.filter(inContent);
const masters = content.filter(p => /\/(?:master-|production-master-)/.test(p));
function stage(p) {
  const n = path.basename(p);
  if (/research|source|search-blueprint/.test(n)) return "research-and-source";
  if (/critic|verif|replay|readiness/.test(n)) return "quality-and-evidence";
  if (/repair|recovery/.test(n)) return "repair-and-recovery";
  if (/progress|database|hydrat|persist/.test(n)) return "state-and-persistence";
  if (/planner|planning|plan|ingress|runtime|artifact/.test(n)) return "planning-and-contracts";
  if (/prompt|context/.test(n)) return "prompt-and-context";
  if (/writer|composer|generator|shell|section/.test(n)) return "generation";
  return "other";
}
const row = p => {
  const inbound = [...(importers.get(p) ?? [])].sort();
  const fromProduction = inbound.filter(p => !isTest(p) && !p.startsWith("scripts/"));
  const fromTests = inbound.filter(isTest);
  return {
    path: p, stageHint: stage(p), ...fileStats.get(p),
    inRuntimeGraph: runtime.has(p),
    inWriterGraph: writer.has(p),
    inTestGraph: tests.has(p),
    inScriptGraph: scripts.has(p),
    directProductionImporters: fromProduction,
    directTestImporters: fromTests,
    directOtherImporters: inbound.filter(p => !fromProduction.includes(p) && !fromTests.includes(p)),
    internalContentDependencies: (edges.get(p) ?? []).filter(inContent),
  };
};
const rows = content.map(row);
const masterRows = masters.map(row);
const orphanMasters = masterRows.filter(m => !isTest(m.path) &&
  !m.inRuntimeGraph && !m.inTestGraph && !m.inScriptGraph);
const onlyTestMasters = masterRows.filter(m => !isTest(m.path) &&
  !m.inRuntimeGraph && m.inTestGraph && !m.inScriptGraph);
const giantModules = rows.filter(r => !isTest(r.path) && r.lines >= 1000)
  .sort((a,b) => b.lines - a.lines);
const summary = {
  contentFiles: content.length,
  contentProduction: content.filter(p => !isTest(p)).length,
  contentTests: content.filter(isTest).length,
  masterFiles: masters.length,
  masterProduction: masters.filter(p => !isTest(p)).length,
  masterTests: masters.filter(isTest).length,
  masterProductionRuntimeReachable: masterRows.filter(m =>
    !isTest(m.path) && m.inRuntimeGraph).length,
  masterProductionWriterReachable: masterRows.filter(m =>
    !isTest(m.path) && m.inWriterGraph).length,
  masterProductionOnlyTest: onlyTestMasters.length,
  masterProductionOrphanCandidates: orphanMasters.length,
  giantContentProductionModules: giantModules.length,
};
const report = {
  version: "GROWTH_OS_WRITER_MODULE_MAP_V1",
  head: execFileSync("git", ["rev-parse", "HEAD"], {encoding: "utf8"}).trim(),
  summary,
  masterProduction: masterRows.filter(r => !isTest(r.path)),
  masterTests: masterRows.filter(r => isTest(r.path)),
  orphanMasters, onlyTestMasters, giantModules,
  contentProduction: rows.filter(r => !isTest(r.path)),
  caveats: [
    "Static import graph; hidden dynamic imports, environment-driven paths and framework discovery may not appear.",
    "inRuntimeGraph is import reachability, not proof a function is invoked.",
    "A test-only module is not automatically dead; mocks and test helpers are valuable.",
    "Do not delete a module based only on this report; first inspect runtime/test behavior.",
    "stageHint is filename-based and informational, not execution-stage evidence."
  ]
};
const out = path.join(cwd, ".growth-os-tmp");
fs.mkdirSync(out, {recursive:true});
fs.writeFileSync(path.join(out,"writer-module-map.json"),JSON.stringify(report,null,2)+"\n",{mode:0o600});
console.log("WRITER_MODULE_MAP_SUMMARY",JSON.stringify(summary));
console.log("MASTER_MODULE_GRAPH",JSON.stringify(report.masterProduction.map(m=>({
  path:m.path.replace(/^src\/lib\/content\//,""), stage:m.stageHint, lines:m.lines,
  live:m.inWriterGraph, runtime:m.inRuntimeGraph, productionImporters:m.directProductionImporters.length,
  testImporters:m.directTestImporters.length,
  deps:m.internalContentDependencies.length
}))));
console.log("MASTER_TEST_ONLY",JSON.stringify(onlyTestMasters.map(x=>x.path)));
console.log("MASTER_ORPHAN_CANDIDATES",JSON.stringify(orphanMasters.map(x=>x.path)));
console.log("GIANT_CONTENT_MODULES",JSON.stringify(giantModules.slice(0,20).map(m=>({path:m.path,lines:m.lines}))));
console.log("WRITER_MODULE_MAP_PATH .growth-os-tmp/writer-module-map.json");
