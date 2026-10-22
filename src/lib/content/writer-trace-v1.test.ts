import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  hashTraceTextV1,
  recordWriterModelExchangeV1,
  recordWriterTraceV1,
  withWriterTraceV1,
} from "./writer-trace-v1";

const previousDirectory = process.env.GROWTH_OS_WRITER_TRACE_DIR;
const previousText = process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT;
const previousArtifacts = process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS;

afterEach(() => {
  if (previousDirectory === undefined) delete process.env.GROWTH_OS_WRITER_TRACE_DIR;
  else process.env.GROWTH_OS_WRITER_TRACE_DIR = previousDirectory;
  if (previousText === undefined) delete process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT;
  else process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT = previousText;
  if (previousArtifacts === undefined) delete process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS;
  else process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS = previousArtifacts;
});

describe("writer execution tracing", () => {
  it("uses a stable hash without exposing the original prompt", () => {
    expect(hashTraceTextV1("example")).toMatch(/^[a-f0-9]{64}$/);
    expect(hashTraceTextV1("example")).not.toBe("example");
  });

  it("records ordered events and redacts credentials without full prompt opt-in", async () => {
    const directory = await mkdtemp(join(tmpdir(), "growth-os-trace-"));
    process.env.GROWTH_OS_WRITER_TRACE_DIR = directory;
    delete process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT;
    try {
      const result = await withWriterTraceV1({scope: "article.test", correlationId: "private-id"}, async () => {
        recordWriterTraceV1("research.selected", {keyword: "credit monitoring", apiKey: "do-not-log"});
        recordWriterModelExchangeV1({
          stage: "generateSection",
          model: "gpt-test",
          prompt: "private-model-prompt",
          output: "private-model-output",
        });
        return 42;
      });
      expect(result).toBe(42);
      const contents = await readFile(join(directory, "writer-runs.jsonl"), "utf8");
      const events = contents.trim().split("\n").map(line => JSON.parse(line));
      expect(events.map(event => event.stage)).toEqual([
        "run.started", "research.selected", "model.exchange", "run.succeeded",
      ]);
      expect(events.map(event => event.eventId)).toEqual([1, 2, 3, 4]);
      expect(events[1].fields.apiKey).toBe("[redacted]");
      expect(events[2].fields.promptSha256).toBe(hashTraceTextV1("private-model-prompt"));
      expect(contents).not.toContain("do-not-log");
      expect(contents).not.toContain("private-model-prompt");
      expect(contents).not.toContain("private-model-output");
    } finally {
      await rm(directory, {recursive: true, force: true});
    }
  });

  it("appends multiple runs to one private JSONL file with per-run ordered events", async () => {
    const directory = await mkdtemp(join(tmpdir(), "growth-os-one-log-"));
    process.env.GROWTH_OS_WRITER_TRACE_DIR = directory;
    try {
      await withWriterTraceV1({ scope: "content.article", correlationId: "brief-a" }, async () => {
        recordWriterTraceV1("article.input_profile", { keywordCandidateLimit: 200 });
      });
      await withWriterTraceV1({ scope: "content.article", correlationId: "brief-b" }, async () => {
        recordWriterTraceV1("writer.draft_generated", { approxWordCount: 2100 });
      });
      expect(await readdir(directory)).toEqual(["writer-runs.jsonl"]);
      const file = join(directory, "writer-runs.jsonl");
      const contents = await readFile(file, "utf8");
      const events = contents.trim().split("\n").map(line => JSON.parse(line));
      const runIds = [...new Set(events.map(event => event.runId))];
      expect(runIds).toHaveLength(2);
      for (const runId of runIds) {
        const runEvents = events.filter(event => event.runId === runId);
        expect(runEvents.map(event => event.eventId)).toEqual(
          runEvents.map((_event, index) => index + 1),
        );
        expect(runEvents[0].stage).toBe("run.started");
        expect(["run.succeeded", "run.failed"]).toContain(runEvents.at(-1).stage);
      }
      expect((await stat(directory)).mode & 0o777).toBe(0o700);
      expect((await stat(file)).mode & 0o777).toBe(0o600);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("distinguishes HTTP error results from successful article runs", async () => {
    const directory = await mkdtemp(join(tmpdir(), "growth-os-trace-"));
    process.env.GROWTH_OS_WRITER_TRACE_DIR = directory;
    try {
      const response = await withWriterTraceV1({scope: "http.test"}, async () => ({status: 422}));
      expect(response.status).toBe(422);
      const [name] = await readdir(directory);
      const events = (await readFile(join(directory, name), "utf8")).trim().split("\n").map(line => JSON.parse(line));
      expect(events.at(-1).stage).toBe("run.http_error");
      expect(events.at(-1).fields.httpStatus).toBe(422);
    } finally {
      await rm(directory, {recursive: true, force: true});
    }
  });

  it("propagates failures after tracing their error class", async () => {
    const directory = await mkdtemp(join(tmpdir(), "growth-os-trace-"));
    process.env.GROWTH_OS_WRITER_TRACE_DIR = directory;
    try {
      await expect(withWriterTraceV1({scope: "failure.test"}, async () => {
        throw new TypeError("testing failure");
      })).rejects.toThrow("testing failure");
      const [name] = await readdir(directory);
      const events = (await readFile(join(directory, name), "utf8")).trim().split("\n").map(line => JSON.parse(line));
      expect(events.at(-1).stage).toBe("run.failed");
      expect(events.at(-1).fields.errorName).toBe("TypeError");
    } finally {
      await rm(directory, {recursive: true, force: true});
    }
  });
});
