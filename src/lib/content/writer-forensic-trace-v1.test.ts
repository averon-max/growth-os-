import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  recordWriterForensicArtifactV1,
  recordWriterModelExchangeV1,
  recordWriterTraceV1,
  withWriterTraceV1,
} from "./writer-trace-v1";

const original = {
  directory: process.env.GROWTH_OS_WRITER_TRACE_DIR,
  artifacts: process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS,
  text: process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT,
};

afterEach(() => {
  const entries = [
    ["GROWTH_OS_WRITER_TRACE_DIR", original.directory],
    ["GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS", original.artifacts],
    ["GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT", original.text],
  ] as const;
  for (const [key, value] of entries) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

async function readEvents(directory: string) {
  const names = (await readdir(directory)).filter(name => name.endsWith(".jsonl"));
  expect(names).toHaveLength(1);
  const name = names[0]!;
  const logText = await readFile(join(directory, name), "utf8");
  const events = logText.trim().split("\n").map(line => JSON.parse(line));
  return { events, logText, runId: name.slice(0, -6) };
}

describe("writer forensic logging-only storage", () => {
  it("stores full private research separately from safe JSONL with verified hash", async () => {
    const dir = await mkdtemp(join(tmpdir(), "growth-os-forensic-"));
    process.env.GROWTH_OS_WRITER_TRACE_DIR = dir;
    process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS = "1";
    const queries = Array.from({ length: 70 }, (_, i) => "keyword-query-" + i);
    const paragraph = "PRIVATE_RESEARCH_TEXT_".repeat(150);
    try {
      await withWriterTraceV1({ scope: "brief.test" }, async () => {
        recordWriterForensicArtifactV1("keywords", {
          queries, paragraph, authToken: "private-value",
          nested: { apiKey: "secret-value" },
        });
      });
      const { events, logText, runId } = await readEvents(dir);
      expect(events.map(event => event.eventId)).toEqual([1, 2, 3]);
      const snapshot = events.find(event => event.stage === "forensic.keywords");
      expect(snapshot.fields.fullArtifact).toBe(true);
      expect(snapshot.fields.artifact).toBeUndefined();
      expect(logText).not.toContain("PRIVATE_RESEARCH_TEXT_");
      expect(logText).not.toContain("keyword-query-");
      const filePath = join(dir, runId + ".artifacts", snapshot.fields.artifactFile);
      const fileText = await readFile(filePath, "utf8");
      const privateData = JSON.parse(fileText);
      expect(privateData.queries).toHaveLength(70);
      expect(privateData.paragraph).toBe(paragraph);
      expect(privateData.authToken).toBe("[redacted]");
      expect(privateData.nested.apiKey).toBe("[redacted]");
      expect(snapshot.fields.artifactSha256).toBe(
        createHash("sha256").update(fileText, "utf8").digest("hex")
      );
      expect(snapshot.fields.artifactBytes).toBe(Buffer.byteLength(fileText));
      expect((await stat(filePath)).mode & 0o077).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("never leaks arbitrary free text to JSONL when private artifacts are disabled", async () => {
    const dir = await mkdtemp(join(tmpdir(), "growth-os-forensic-"));
    process.env.GROWTH_OS_WRITER_TRACE_DIR = dir;
    delete process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS;
    process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT = "1";
    try {
      await withWriterTraceV1({ scope: "brief.test" }, async () => {
        recordWriterTraceV1("research.selected", {
          keyword: "PRIVATE_KEYWORD_VALUE",
          nested: { editorialNotes: "PRIVATE_NOTES_VALUE" },
          status: "REVIEW",
          apiKey: "PRIVATE_KEY_VALUE",
        });
        recordWriterModelExchangeV1({
          stage: "generateSection",
          model: "gpt-test",
          prompt: "PRIVATE_PROMPT_VALUE",
          output: "PRIVATE_OUTPUT_VALUE",
        });
        recordWriterForensicArtifactV1("keywords", {
          arbitrary: "PRIVATE_ARTIFACT_VALUE",
        });
      });
      const { events, logText } = await readEvents(dir);
      expect(logText).not.toMatch(/PRIVATE_(KEYWORD|NOTES|KEY|PROMPT|OUTPUT|ARTIFACT)_VALUE/);
      const selected = events.find(event => event.stage === "research.selected");
      expect(selected.fields.keyword).toMatchObject({ chars: "PRIVATE_KEYWORD_VALUE".length });
      expect(selected.fields.status).toBe("REVIEW");
      expect(selected.fields.apiKey).toBe("[redacted]");
      const exchange = events.find(event => event.stage === "model.exchange");
      expect(exchange.fields.textMode).toBe("HASHES_ONLY");
      expect(events.find(event => event.stage === "forensic.keywords").fields.fullArtifact).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("keeps nested calls in one ordered trace", async () => {
    const dir = await mkdtemp(join(tmpdir(), "growth-os-forensic-"));
    process.env.GROWTH_OS_WRITER_TRACE_DIR = dir;
    try {
      await withWriterTraceV1({ scope: "outer" }, async () => {
        recordWriterTraceV1("outer.started");
        await withWriterTraceV1({ scope: "nested" }, async () => {
          recordWriterTraceV1("nested.event");
        });
        recordWriterTraceV1("outer.finished");
      });
      const { events } = await readEvents(dir);
      expect(events.map(event => event.stage)).toEqual([
        "run.started", "outer.started", "nested.event",
        "outer.finished", "run.succeeded",
      ]);
      expect(events.map(event => event.eventId)).toEqual([1, 2, 3, 4, 5]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("distinguishes persisted article rejection from success", async () => {
    const dir = await mkdtemp(join(tmpdir(), "growth-os-forensic-"));
    process.env.GROWTH_OS_WRITER_TRACE_DIR = dir;
    try {
      await withWriterTraceV1({ scope: "article.test" }, async () => ({
        id: "article-test", status: "REJECTED",
      }));
      const { events } = await readEvents(dir);
      expect(events.at(-1)?.stage).toBe("run.article_rejected");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("keeps two simultaneous writer runs isolated", async () => {
    const dir = await mkdtemp(join(tmpdir(), "growth-os-concurrent-"));
    process.env.GROWTH_OS_WRITER_TRACE_DIR = dir;
    try {
      await Promise.all(["first", "second"].map(label =>
        withWriterTraceV1({ scope: "parallel.test" }, async () => {
          recordWriterTraceV1("parallel.begin", { label });
          await Promise.resolve();
          recordWriterTraceV1("parallel.end", { label });
        })
      ));
      const files = (await readdir(dir)).filter(name => name.endsWith(".jsonl"));
      expect(files).toHaveLength(2);
      const runs = await Promise.all(files.map(async name =>
        (await readFile(join(dir, name), "utf8")).trim().split("\n").map(JSON.parse)
      ));
      expect(new Set(runs.map(run => run[0].runId)).size).toBe(2);
      for (const run of runs) {
        expect(run.map(event => event.stage)).toEqual([
          "run.started", "parallel.begin", "parallel.end", "run.succeeded",
        ]);
        expect(new Set(run.map(event => event.runId)).size).toBe(1);
        expect(run[1].fields.label.sha256).toEqual(run[2].fields.label.sha256);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("runs without touching disk when tracing is disabled", async () => {
    delete process.env.GROWTH_OS_WRITER_TRACE_DIR;
    let executions = 0;
    const result = await withWriterTraceV1({ scope: "disabled.test" }, async () => {
      executions++;
      recordWriterTraceV1("unused");
      recordWriterForensicArtifactV1("unused", { privateText: "value" });
      return "writer-result";
    });
    expect(result).toBe("writer-result");
    expect(executions).toBe(1);
  });

});
