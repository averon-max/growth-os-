#!/usr/bin/env node
// Diagnostic-only JSONL event counter; does not modify project state.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
const folder = process.argv[2] || ".growth-os-traces";
const names = (await readdir(folder)).filter(name => name.endsWith(".jsonl"));
const report = [];
for (const name of names) {
  const source = await readFile(join(folder, name), "utf8");
  const events = source.split("\n").filter(Boolean).map(line => JSON.parse(line));
  report.push({file:name, eventCount: events.length,
    stages:[...new Set(events.map(event => event.stage))]});
}
console.log(JSON.stringify(report, null, 2));
