import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  recordWriterForensicArtifactV1,
  withWriterTraceV1,
} from "./writer-trace-v1";

const previousDirectory = process.env.GROWTH_OS_WRITER_TRACE_DIR;
const previousArtifacts = process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS;

afterEach(() => {
  if (previousDirectory === undefined) delete process.env.GROWTH_OS_WRITER_TRACE_DIR;
  else process.env.GROWTH_OS_WRITER_TRACE_DIR = previousDirectory;
  if (previousArtifacts === undefined) delete process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS;
  else process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS = previousArtifacts;
});

async function readEvents(directory: string) {
  const [file] = await readdir(directory);
  const content = await readFile(join(directory, file), "utf8");
  return content.trim().split("\n").map(line => JSON.parse(line));
}

describe("writer forensic diagnostics", () => {
  it("records exact deep keyword input without array or text truncation when opted in", async () => {
    const directory = await mkdtemp(join(tmpdir(), "writer-forensic-"));
    process.env.GROWTH_OS_WRITER_TRACE_DIR = directory;
    process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS = "1";
    const seventyQueries = Array.from({ length: 70 }, (_, i) => "query-" + i);
    const paragraph = "text ".repeat(600);
    try {
      await withWriterTraceV1({ scope: "brief.test" }, async () => {
        recordWriterForensicArtifactV1("keywords", {
          queries: seventyQueries, paragraph,
          authToken: "private-value",
          nested: { apiKey: "secret-value" },
        });
      });
      const events = await readEvents(directory);
      const artifact = events.find(e => e.stage === "forensic.keywords");
      expect(artifact.fields.artifact.queries).toHaveLength(70);
      expect(artifact.fields.artifact.paragraph).toBe(paragraph);
      expect(artifact.fields.artifact.authToken).toBe("[redacted]");
      expect(artifact.fields.artifact.nested.apiKey).toBe("[redacted]");
      expect(events.map(e => e.eventId)).toEqual([1, 2, 3]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("emits only metadata when full artifacts are not enabled", async () => {
    const directory = await mkdtemp(join(tmpdir(), "writer-forensic-"));
    process.env.GROWTH_OS_WRITER_TRACE_DIR = directory;
    delete process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS;
    try {
      await withWriterTraceV1({ scope: "brief.test" }, async () => {
        recordWriterForensicArtifactV1("keywords", { sensitive: "never-logged" });
      });
      const events = await readEvents(directory);
      const diagnostic = events.find(e => e.stage === "forensic.keywords");
      expect(diagnostic.fields.fullArtifact).toBe(false);
      expect(JSON.stringify(events)).not.toContain("never-logged");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("marks rejected persisted article status separately from run success", async () => {
    const directory = await mkdtemp(join(tmpdir(), "writer-forensic-"));
    process.env.GROWTH_OS_WRITER_TRACE_DIR = directory;
    try {
      await withWriterTraceV1({ scope: "article.test" }, async () => ({
        id: "article-test", status: "REJECTED",
      }));
      const events = await readEvents(directory);
      expect(events.at(-1).stage).toBe("run.article_rejected");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
