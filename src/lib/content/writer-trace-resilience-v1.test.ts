import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  recordWriterTraceV1,
  recordWriterForensicArtifactV1,
  withWriterTraceV1,
} from "./writer-trace-v1";

const originalDirectory = process.env.GROWTH_OS_WRITER_TRACE_DIR;
const originalArtifacts = process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS;

afterEach(() => {
  if (originalDirectory === undefined) delete process.env.GROWTH_OS_WRITER_TRACE_DIR;
  else process.env.GROWTH_OS_WRITER_TRACE_DIR = originalDirectory;
  if (originalArtifacts === undefined) delete process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS;
  else process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS = originalArtifacts;
  vi.restoreAllMocks();
});

describe("writer trace reliability, without generating an article", () => {
  it("does not leak an untrusted stage label into SAFE JSONL", async () => {
    const directory = await mkdtemp(join(tmpdir(), "growth-os-stage-"));
    const secret = "very-private-stage-needle";
    process.env.GROWTH_OS_WRITER_TRACE_DIR = directory;
    process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS = "1";
    try {
      await withWriterTraceV1({ scope: "test" }, async () => {
        recordWriterTraceV1("stage/" + secret, { stage: "safe" });
        recordWriterForensicArtifactV1("stage/" + secret, { keyword: "private source" });
      });
      const [name] = (await readdir(directory)).filter(value => value.endsWith(".jsonl"));
      const contents = await readFile(join(directory, name!), "utf8");
      expect(contents).not.toContain(secret);
      const events = contents.trim().split("\n").map(line => JSON.parse(line));
      expect(events.some(e => e.stage === "trace.invalid_stage")).toBe(true);
      expect(events.some(e => e.stage === "forensic.invalid_stage")).toBe(true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("does not execute the action if the initial trace destination is invalid", async () => {
    const directory = await mkdtemp(join(tmpdir(), "growth-os-preflight-"));
    const blocked = join(directory, "is-a-file");
    await writeFile(blocked, "not a directory");
    process.env.GROWTH_OS_WRITER_TRACE_DIR = join(blocked, "trace");
    let executions = 0;
    try {
      await expect(withWriterTraceV1({ scope: "preflight" }, async () => {
        executions++;
        return 1;
      })).rejects.toThrow();
      expect(executions).toBe(0);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("reports write failures without changing the action result", async () => {
    const directory = await mkdtemp(join(tmpdir(), "growth-os-write-failure-"));
    process.env.GROWTH_OS_WRITER_TRACE_DIR = directory;
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await withWriterTraceV1({ scope: "write-failure" }, async () => {
        const [name] = (await readdir(directory)).filter(value => value.endsWith(".jsonl"));
        const filePath = join(directory, name!);
        await rm(filePath);
        await mkdir(filePath); // deliberately make appendFile fail with EISDIR
        recordWriterTraceV1("research.collected", { count: 3 });
        return 42;
      });
      expect(result).toBe(42);
      expect(errors.mock.calls.some(call => String(call[0]).includes("write failed"))).toBe(true);
      expect(errors.mock.calls.some(call => String(call[0]).includes("incomplete log"))).toBe(true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
