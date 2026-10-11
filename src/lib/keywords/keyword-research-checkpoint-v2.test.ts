import { beforeEach, describe, expect, it, vi } from "vitest";

const { store, findUnique, upsert } = vi.hoisted(() => {
  const store = new Map<string, { payload: unknown; fetchedAt: Date }>();
  const findUnique = vi.fn(async ({ where }: { where: { normalized_source: { normalized: string; source: string } } }) =>
    store.get(where.normalized_source.source + ":" + where.normalized_source.normalized) ?? null);
  const upsert = vi.fn(async ({ where, create }: {
    where: { normalized_source: { normalized: string; source: string } };
    create: { payload: unknown };
  }) => {
    store.set(where.normalized_source.source + ":" + where.normalized_source.normalized,
      { payload: create.payload, fetchedAt: new Date() });
  });
  return { store, findUnique, upsert };
});
vi.mock("@/lib/prisma", () => ({
  prisma: { keywordSuggestionCache: { findUnique, upsert } },
}));
import { withKeywordResearchCheckpointV2 } from "./keyword-research-checkpoint-v2";

const args = (produce: () => Promise<string[]>) => ({
  stage: "DISCOVERY" as const,
  key: "website:US:seed:500",
  isValid: (value: unknown): value is string[] =>
    Array.isArray(value) && value.every(x => typeof x === "string"),
  produce,
});

describe("paid research checkpoint V2", () => {
  beforeEach(() => { store.clear(); vi.clearAllMocks(); });
  it("persists a completed stage and reuses it after downstream failure", async () => {
    const paid = vi.fn().mockResolvedValue(["keyword"]);
    await withKeywordResearchCheckpointV2(args(paid));
    await expect(Promise.reject(new Error("GPT_FAILED"))).rejects.toThrow("GPT_FAILED");
    expect(await withKeywordResearchCheckpointV2(args(paid))).toEqual(["keyword"]);
    expect(paid).toHaveBeenCalledTimes(1);
  });
  it("deduplicates simultaneous same-key requests", async () => {
    const paid = vi.fn().mockResolvedValue(["keyword"]);
    const result = await Promise.all(Array.from({ length: 3 }, () =>
      withKeywordResearchCheckpointV2(args(paid))));
    expect(result).toEqual([["keyword"], ["keyword"], ["keyword"]]);
    expect(paid).toHaveBeenCalledTimes(1);
  });
  it("does not save a failed paid stage", async () => {
    const paid = vi.fn().mockRejectedValueOnce(new Error("DATAFORSEO_ERROR")).mockResolvedValue(["next"]);
    await expect(withKeywordResearchCheckpointV2(args(paid))).rejects.toThrow("DATAFORSEO_ERROR");
    expect(store.size).toBe(0);
    expect(await withKeywordResearchCheckpointV2(args(paid))).toEqual(["next"]);
    expect(paid).toHaveBeenCalledTimes(2);
  });
});