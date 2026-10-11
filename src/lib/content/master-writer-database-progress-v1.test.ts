import { describe, expect, it } from "vitest";
import {
  encodeMasterWriterDatabaseProgressV1,
  decodeMasterWriterDatabaseProgressV1,
} from "./master-writer-database-progress-v1";
import type { MasterWriterSectionProgressV1 } from "./master-writer-section-progress-v1";

const identity = { articleId: "article-1", briefId: "brief-1", contractHash: "a".repeat(64), modelName: "model-A" };
const sample = {
  ...identity,
  shell: { version: "ARTICLE_SHELL_V1", title: "Title", h1: "H1", metaDescription: "Meta" },
  accepted: [],
} as unknown as Omit<MasterWriterSectionProgressV1, "version">;

function reorderKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reorderKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).reverse().map(([k,v]) => [k, reorderKeys(v)]));
  }
  return value;
}

describe("Writer DB checkpoint JSONB codec", () => {
  it("returns null if not present", () => {
    expect(decodeMasterWriterDatabaseProgressV1(null, identity)).toBeNull();
  });
  it("round-trips exact identity and accepted prefix", () => {
    const envelope = JSON.parse(JSON.stringify(encodeMasterWriterDatabaseProgressV1(sample)));
    expect(decodeMasterWriterDatabaseProgressV1(envelope, identity)?.shell.title).toBe("Title");
    expect(decodeMasterWriterDatabaseProgressV1(envelope, identity)?.accepted).toEqual([]);
  });
  it("survives PostgreSQL JSONB object key reordering", () => {
    const envelope = reorderKeys(encodeMasterWriterDatabaseProgressV1(sample));
    expect(decodeMasterWriterDatabaseProgressV1(envelope, identity)?.articleId).toBe("article-1");
  });
  it("blocks tampering and changed contract", () => {
    const changed = JSON.parse(JSON.stringify(encodeMasterWriterDatabaseProgressV1(sample)));
    changed.checkpoint.shell.title = "TAMPERED";
    expect(() => decodeMasterWriterDatabaseProgressV1(changed, identity)).toThrow("MASTER_WRITER_DB_PROGRESS_CORRUPTED");
    const valid = encodeMasterWriterDatabaseProgressV1(sample);
    expect(() => decodeMasterWriterDatabaseProgressV1(valid, {...identity, contractHash:"b".repeat(64)}))
      .toThrow("MASTER_WRITER_DB_PROGRESS_CONTRACT_MISMATCH");
  });
  it("rejects sections that failed semantic checks", () => {
    const bad = {...sample, accepted:[{section:{version:"GENERATED_SECTION_V1"},
      semanticVerification:{status:"BLOCK"},reconciliation:{status:"PASS"},repair:{}}]} as unknown as Omit<MasterWriterSectionProgressV1,"version">;
    expect(() => encodeMasterWriterDatabaseProgressV1(bad))
      .toThrow("MASTER_WRITER_DB_PROGRESS_INVALID");
  });
});
