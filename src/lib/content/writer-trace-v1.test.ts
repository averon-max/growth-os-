import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
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

afterEach(() => {
  if (previousDirectory === undefined) delete process.env.GROWTH_OS_WRITER_TRACE_DIR;
  else process.env.GROWTH_OS_WRITER_TRACE_DIR = previousDirectory;
  if (previousText === undefined) delete process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT;
  else process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT = previousText;
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
      const names = await readdir(directory);
      expect(names).toHaveLength(1);
      const contents = await readFile(join(directory, names[0]), "utf8");
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

  it("propagates failures after tracing their error class", async () => {
    const directory = await mkdtemp(join(tmpdir(), "growth-os-trace-"));
    process.env.GROWTH_OS_WRITER_TRACE_DIR = directory;
    try {
      await expect(withWriterTraceV1({scope: "failure.test"}, async () => {
        throw new TypeError("testing failure");
      })).rejects.toThrow("testing failure");
      const [name] = await readdir(directory);
      const events = (await readFile(join(directory, name), "utf8")).trim().split("\n").map(JSON.parse);
      expect(events.at(-1).stage).toBe("run.failed");
      expect(events.at(-1).fields.errorName).toBe("TypeError");
    } finally {
      await rm(directory, {recursive: true, force: true});
    }
  });
});
