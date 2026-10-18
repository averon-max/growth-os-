/**
 * OFFLINE TRACE ACCEPTANCE TEST.
 * This is a synthetic playback through the REAL logger and REAL report reader.
 * It is NOT a real ContentArticle generation and proves no actual provider
 * stage was invoked. No PostgreSQL, network, GPT or paid DataForSEO calls.
 */
import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  hashTraceTextV1,
  recordWriterForensicArtifactV1,
  recordWriterModelExchangeV1,
  recordWriterTraceV1,
  withWriterTraceV1,
} from "./writer-trace-v1";

const reportScript = fileURLToPath(
  new URL("../../../scripts/writer-trace-report.mjs", import.meta.url)
);
const envKeys = [
  "GROWTH_OS_WRITER_TRACE_DIR",
  "GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS",
  "GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT",
] as const;
const initialEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));

afterEach(() => {
  for (const key of envKeys) {
    const previous = initialEnv[key];
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
});

async function readRunFiles(directory: string) {
  const files = (await readdir(directory)).filter(name => name.endsWith(".jsonl"));
  return Promise.all(files.map(async name => ({
    name,
    text: await readFile(join(directory, name), "utf8"),
  })));
}

describe("offline Writer trace acceptance / cross-run lineage", () => {
  it("connects brief and article, records critic+repair and validates every detached artifact", async () => {
    const directory = await mkdtemp(join(tmpdir(), "growth-os-offline-acceptance-"));
    process.env.GROWTH_OS_WRITER_TRACE_DIR = directory;
    process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS = "1";
    process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT = "1";
    const websiteId = "fixture-website-id";
    const briefId = "fixture-brief-id";
    const briefHash = hashTraceTextV1(briefId);
    const privateKeyword = "PRIVATE_SEARCH_QUERY_ALPHA";
    const privateDraft = "# Credit Monitoring\n\n## First draft\n\nPRIVATE_DRAFT_CONTENT";
    const repairedDraft = "# Credit Monitoring\n\n## What to know\n\nPRIVATE_REPAIRED_CONTENT";
    try {
      // Mimics event boundaries from createContentBrief; no real brief is created.
      await withWriterTraceV1({scope: "content.brief", correlationId: websiteId}, async () => {
        recordWriterTraceV1("brief.entrypoint", {generationMode: "EXACT_KEYWORD"});
        const queries = Array.from({length: 72}, (_, i) => ({
          query: i === 0 ? privateKeyword : "fixture keyword " + i,
          score: 72 - i,
          selectionReason: i === 0 ? "PRIMARY" : "MERGED_INTENT",
        }));
        recordWriterForensicArtifactV1("keywords.full_strategy", {queries});
        recordWriterTraceV1("keyword.selected", {keyword: privateKeyword, secondaryQueries: []});
        recordWriterForensicArtifactV1("serp.initial_full_results", {
          organic: [{url: "https://example.org/credit", title: "Consumer guide"}],
        });
        recordWriterForensicArtifactV1("planner.final_artifacts", {
          sections: [{h2:"What to know", query:privateKeyword}],
        });
        recordWriterTraceV1("brief.correlation", {
          briefIdSha256: briefHash,
          websiteIdSha256: hashTraceTextV1(websiteId),
        });
        recordWriterForensicArtifactV1("brief.final", {
          createdBriefId: briefId, primaryKeyword: privateKeyword,
        });
      });

      // Mimics event boundaries from generateArticleFromBrief.
      await withWriterTraceV1({scope: "content.article", correlationId: briefId}, async () => {
        recordWriterTraceV1("article.entrypoint", {briefIdSha256:briefHash});
        recordWriterForensicArtifactV1("research.snapshot_and_provenance", {
          sources:[{url:"https://example.org/credit",verified:true}],
        });
        recordWriterForensicArtifactV1("writer.draft_and_contract", {
          draft:privateDraft, requiredTopics:["What to know"],
        });
        recordWriterModelExchangeV1({
          stage:"masterWriter",
          model:"fixture-model",
          prompt:"PRIVATE_MODEL_PROMPT",
          output:privateDraft,
        });
        recordWriterTraceV1("writer.draft_generated", {
          markdownChars:privateDraft.length,h2Count:1,h3Count:0,
        });
        recordWriterForensicArtifactV1("critic.initial_suite", {
          passed:false,issueCodes:["MISSING_REQUIRED_TOPIC"],
        });
        recordWriterForensicArtifactV1("critic.repair_execution", {
          before:privateDraft,after:repairedDraft,
          changedSections:["What to know"],
        });
        recordWriterForensicArtifactV1("serp.replay_and_repair", {
          observed:true,issues:[],
        });
        recordWriterForensicArtifactV1("audit.final_readiness", {
          passed:true,bodyMarkdown:repairedDraft,
        });
        return {status:"IN_REVIEW"};
      });

      const files = await readRunFiles(directory);
      expect(files).toHaveLength(2);
      expect(files.map(f => f.name)).not.toContain("fixture-brief-id.jsonl");
      const allJsonl = files.map(f => f.text).join("\n");
      for (const secret of [privateKeyword, privateDraft, repairedDraft, "PRIVATE_MODEL_PROMPT"]) {
        expect(allJsonl).not.toContain(secret);
      }

      const parsedRuns = files.map(file => file.text.trim().split("\n").map(line => JSON.parse(line)));
      for (const events of parsedRuns) {
        expect(events[0].stage).toBe("run.started");
        expect(events.at(-1).stage).toBe("run.succeeded");
        expect(events.map(e=>e.eventId)).toEqual(events.map((_, i)=>i+1));
        expect(new Set(events.map(e=>e.runId)).size).toBe(1);
      }
      const briefEvents = parsedRuns.find(events => events.some(e=>e.stage==="brief.correlation"))!;
      const articleEvents = parsedRuns.find(events => events.some(e=>e.stage==="article.entrypoint"))!;
      expect(briefEvents.find(e=>e.stage==="brief.correlation").fields.briefIdSha256).toBe(briefHash);
      expect(articleEvents.find(e=>e.stage==="article.entrypoint").fields.briefIdSha256).toBe(briefHash);
      expect(briefEvents[0].runId).not.toBe(articleEvents[0].runId);

      const report = JSON.parse(execFileSync(process.execPath,
        [reportScript,directory],{encoding:"utf8"}));
      expect(report.readOnly).toBe(true);
      expect(report.containsPrivateData).toBe(false);
      expect(report.reportCount).toBe(2);
      expect(report.relatedRuns).toHaveLength(1);
      expect(report.relatedRuns[0].briefIdSha256).toBe(briefHash);
      expect(report.relatedRuns[0].briefRunId).toBe(briefEvents[0].runId);
      expect(report.relatedRuns[0].articleRunId).toBe(articleEvents[0].runId);
      for (const run of report.reports) {
        expect(run.parseErrorLines).toEqual([]);
        expect(run.warnings).not.toContain("MALFORMED_JSONL");
        expect(run.warnings).not.toContain("ARTIFACT_INTEGRITY_FAILURE");
        expect(run.warnings).not.toContain("NONCONTIGUOUS_SEQUENCE");
        expect(run.artifactChecks.length).toBeGreaterThan(2);
        expect(run.artifactChecks.every((check: {valid:boolean}) => check.valid)).toBe(true);
      }

      const raw = JSON.parse(execFileSync(process.execPath,
        [reportScript,directory,"--stage","forensic.","--raw"],{encoding:"utf8"}));
      expect(raw.containsPrivateData).toBe(true);
      // JSON.stringify escapes newlines. Compare decoded artifact fields, not serialized JSON.
      const rawBrief = raw.reports.find((run: {scope: string}) => run.scope === "content.brief");
      const rawArticle = raw.reports.find((run: {scope: string}) => run.scope === "content.article");
      const keywords = rawBrief.rawEvents.find(
        (event: {stage: string}) => event.stage === "forensic.keywords.full_strategy"
      );
      const repair = rawArticle.rawEvents.find(
        (event: {stage: string}) => event.stage === "forensic.critic.repair_execution"
      );
      const readiness = rawArticle.rawEvents.find(
        (event: {stage: string}) => event.stage === "forensic.audit.final_readiness"
      );
      expect(keywords.privateArtifact.queries[0].query).toBe(privateKeyword);
      expect(repair.privateArtifact.after).toBe(repairedDraft);
      expect(readiness.privateArtifact.bodyMarkdown).toBe(repairedDraft);
      expect(allJsonl).not.toContain(repairedDraft);
      // Hash references should identify exact persisted source bytes.
      const expected = createHash("sha256").update(briefId).digest("hex");
      expect(expected).toBe(briefHash);
    } finally {
      await rm(directory,{recursive:true,force:true});
    }
  });
});
