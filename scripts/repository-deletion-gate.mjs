#!/usr/bin/env node
/**
 * Growth OS deletion safety gate.
 * Every tracked file deleted in the current commit needs an exact-blob
 * decision describing its consumers, compatibility, tests, and rollback.
 * Rename is also treated as delete+add. Read-only: no DB or file writes.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import ts from "typescript";

const MANIFEST = "docs/repository-audit/deletion-decisions.json";
const REQUIRED = [
  "purposeAndReason",
  "realImportersAndConsumers",
  "dynamicRuntimeAndExternalCallers",
  "schemaDataAndHistoricalCompatibility",
  "testEvidenceAndLiveRisks",
  "rollbackPlan",
];
function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore","pipe","pipe"] }).trimEnd();
}
function descriptive(value, min = 40) {
  return typeof value === "string" && value.trim().length >= min;
}
function validateDecision(value, filePath, oldSha) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return ["Decision must be an object"];
  }
  const errors = [];
  if (value.path !== filePath) errors.push("Path must match deleted file exactly");
  if (value.blobSha !== oldSha) errors.push("Blob SHA mismatch (stale decision)");
  if (value.approvedRemoval !== true) errors.push("approvedRemoval must be true after review");
  for (const key of REQUIRED) if (!descriptive(value.evidence?.[key])) {
    errors.push("Detailed evidence required: " + key);
  }
  if (!Array.isArray(value.baselineImporters) ||
      !value.baselineImporters.every(v => typeof v === "string")) {
    errors.push("baselineImporters must be an explicit array");
  }
  if (!Array.isArray(value.validationCommands) ||
      value.validationCommands.length < 2 ||
      !value.validationCommands.every(v => descriptive(v,8))) {
    errors.push("At least two concrete validation commands are required");
  }
  return errors;
}
function resolveImport(from,spec) {
  if (!(spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("@/"))) return null;
  return spec.startsWith("@/") ? "src/" + spec.slice(2) :
    path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
}
function listedImports(filename,source) {
  const ast = ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true,
    filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const imports = [];
  function visit(n) {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
        n.moduleSpecifier && ts.isStringLiteralLike(n.moduleSpecifier)) {
      imports.push(n.moduleSpecifier.text);
    }
    if (ts.isCallExpression(n) && n.arguments.length &&
        ts.isStringLiteralLike(n.arguments[0]) &&
        (n.expression.kind === ts.SyntaxKind.ImportKeyword ||
         n.expression.getText(ast) === "require")) imports.push(n.arguments[0].text);
    ts.forEachChild(n,visit);
  }
  visit(ast);
  return imports;
}
function importersFor(target) {
  const tracked = git(["ls-files","-z"]).split("\0").filter(Boolean);
  const importers = [];
  const noExt = target.replace(/\.(?:[cm]?[jt]sx?)$/,"").replace(/\/index$/,"");
  for (const name of tracked) {
    if (!/\.[cm]?[jt]sx?$/.test(name) || name === target ||
        !fs.existsSync(name) || !fs.statSync(name).isFile()) continue;
    const imports = listedImports(name,fs.readFileSync(name,"utf8"));
    for (const spec of imports) {
      const candidate = resolveImport(name,spec);
      if (candidate && (candidate === target || candidate === noExt ||
          candidate.replace(/\.(?:[cm]?[jt]sx?)$/,"") === noExt)) {
        importers.push({file:name,spec});
      }
    }
  }
  return importers.sort((a,b) => a.file.localeCompare(b.file));
}
function inspectPath(file) {
  if (!/^[\w./@-]+$/.test(file) || file.startsWith("/") || file.includes("..")) {
    throw new Error("Invalid path");
  }
  if (!fs.existsSync(file)) throw new Error("NOT_PRESENT: " + file);
  const importers = importersFor(file);
  const counts = {
    runtime: importers.filter(x => x.file.startsWith("src/") &&
      !/\.(test|spec)\./.test(x.file)).length,
    tests: importers.filter(x => /\.(test|spec)\./.test(x.file)).length,
    scripts: importers.filter(x => x.file.startsWith("scripts/")).length,
  };
  console.log(JSON.stringify({
    path:file,
    blobSha:git(["hash-object",file]),
    bytes:fs.statSync(file).size,
    directStaticImporters:importers,
    counts,
    warning:"Static imports only: manually review dynamic calls, entrypoints, schema, persisted data and scripts."
  },null,2));
}
function checkDeletionGate() {
  let parent;
  try { parent = git(["rev-parse","HEAD^"]); }
  catch { console.log("DELETION_GATE_ROOT_COMMIT_SKIP"); return; }
  // Compare against the first parent even for a merge commit; diff-tree
  // without -m may silently return no paths for a merge.
  const deleted = git(["diff","--name-status","--no-renames","HEAD^","HEAD","--"])
    .split("\n").filter(v => v.startsWith("D\t")).map(v => v.slice(2));
  if (!deleted.length) {
    console.log("DELETION_GATE_PASS: no deleted tracked files in current commit");
    return;
  }
  if (!fs.existsSync(MANIFEST)) throw new Error("DELETION_GATE_MANIFEST_MISSING");
  const manifest = JSON.parse(fs.readFileSync(MANIFEST,"utf8"));
  if (manifest.version !== "GROWTH_OS_DELETION_DECISIONS_V1" ||
      !Array.isArray(manifest.decisions)) throw new Error("DELETION_GATE_MANIFEST_INVALID");
  let failures = 0;
  for (const file of deleted) {
    const matches = manifest.decisions.filter(row => row?.path === file);
    const originalSha = git(["rev-parse",parent + ":" + file]);
    const errors = matches.length === 1 ?
      validateDecision(matches[0],file,originalSha) :
      ["Exactly one deletion decision required for this path"];
    if (errors.length) {
      failures++;
      console.error("DELETION_BLOCKED: " + file + "\n  " + errors.join("\n  "));
    } else console.log("DELETION_REVIEW_DOCUMENTED: " + file);
  }
  if (failures) throw new Error("DELETION_GATE_FAILED: " + failures + " files");
  console.log("DELETION_GATE_PASS: " + deleted.length + " individually documented deletions");
}
function selfTest() {
  const file = "src/lib/content/unused.ts",sha = "a".repeat(40);
  const example = {
    path:file, blobSha:sha, approvedRemoval:true, baselineImporters:[],
    validationCommands:["npx tsc --noEmit","npx vitest run"],
    evidence:Object.fromEntries(REQUIRED.map(k => [k,
      "Reviewed " + k + ", dependencies, persisted state and exact rollback requirements before deletion."]))
  };
  assert.deepEqual(validateDecision(example,file,sha),[]);
  assert.ok(validateDecision({...example,blobSha:"b".repeat(40)},file,sha).length);
  assert.ok(validateDecision({...example,evidence:{}},file,sha).length >= REQUIRED.length);
  assert.ok(validateDecision({...example,baselineImporters:"none"},file,sha).length);
  assert.equal(resolveImport("src/lib/content/service.ts","./master-writer-orchestrator"),
    "src/lib/content/master-writer-orchestrator");
  assert.equal(resolveImport("src/lib/content/service.ts","@/lib/prisma"),"src/lib/prisma");
  console.log("DELETION_GATE_SELF_TEST_PASS");
}
try {
  const command = process.argv[2] ?? "--check";
  if (command === "--self-test") selfTest();
  else if (command === "--inspect") inspectPath(process.argv[3] ?? "");
  else if (command === "--check") checkDeletionGate();
  else throw new Error("USAGE: --inspect file | --self-test | --check");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
