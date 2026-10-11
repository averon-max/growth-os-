import { describe, expect, it } from "vitest";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readMasterWriterSectionProgressV1,
  writeMasterWriterSectionProgressV1,
} from "./master-writer-section-progress-v1";

describe("Master Writer local section checkpoint", () => {
  it("writes atomically, validates fingerprint, and rejects tampering", async () => {
    const directory = await mkdtemp(join(tmpdir(), "growth-os-progress-"));
    const id = "article-1";
    const contractHash = "a".repeat(64);
    const modelName = "test-model";
    try {
      const args = { directory, articleId: id, briefId: "brief-1", contractHash, modelName };
      const shell = {
        version: "ARTICLE_SHELL_V1" as const,
        title: "Test Title", metaDescription: "Test metadata", h1: "Test H1",
        provenance: {
          sourceContractVersion: "ARTICLE_GENERATION_CONTRACT_V1" as const,
          sourceRuntimeVersion: "MASTER_RUNTIME_SNAPSHOT_V1" as const,
          modelName, h1Mission: "Test mission",
        },
      };
      expect(await readMasterWriterSectionProgressV1(args)).toBeNull();
      const target = await writeMasterWriterSectionProgressV1({ ...args, shell, accepted: [] });
      const verified = await readMasterWriterSectionProgressV1(args);
      expect(verified?.shell.title).toBe("Test Title");
      await expect(readMasterWriterSectionProgressV1({ ...args, contractHash: "b".repeat(64) }))
        .rejects.toThrow("MASTER_WRITER_PROGRESS_CONTRACT_MISMATCH");
      const envelope = JSON.parse(await readFile(target, "utf8"));
      envelope.checkpoint.shell.title = "Tampered";
      await writeFile(target, JSON.stringify(envelope));
      await expect(readMasterWriterSectionProgressV1(args))
        .rejects.toThrow("MASTER_WRITER_PROGRESS_CORRUPTED");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
