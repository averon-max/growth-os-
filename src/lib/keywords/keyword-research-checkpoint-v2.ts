import { prisma } from "@/lib/prisma";

/**
 * Durable, bounded checkpoints for already-paid keyword research steps.
 * Uses the existing KeywordSuggestionCache table; no new migration.
 *
 * A rejected model decision must never force DataForSEO discovery or
 * successful SERP pages to be purchased again while checkpoints are fresh.
 */
export type KeywordResearchStageV2 = "DISCOVERY" | "SERP";
export const KEYWORD_RESEARCH_CHECKPOINT_TTL_V2 = 24 * 60 * 60 * 1000;

const inflight = new Map<string, Promise<unknown>>();

export async function withKeywordResearchCheckpointV2<T>({
  stage,
  key,
  isValid,
  produce,
  ttlMs = KEYWORD_RESEARCH_CHECKPOINT_TTL_V2,
}: {
  stage: KeywordResearchStageV2;
  key: string;
  isValid: (value: unknown) => value is T;
  produce: () => Promise<T>;
  ttlMs?: number;
}): Promise<T> {
  if (!key || !Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new Error("KEYWORD_V2_CHECKPOINT_INPUT_INVALID");
  }
  const source = "KEYWORD_INTELLIGENCE_V2_" + stage;
  const flightKey = source + ":" + key;
  const current = inflight.get(flightKey);
  if (current) return current as Promise<T>;

  const pending = (async () => {
    const saved = await prisma.keywordSuggestionCache.findUnique({
      where: { normalized_source: { normalized: key, source } },
    });
    if (saved && Date.now() - saved.fetchedAt.getTime() < ttlMs &&
        isValid(saved.payload)) {
      return saved.payload;
    }

    const value = await produce();
    if (!isValid(value)) {
      throw new Error("KEYWORD_V2_CHECKPOINT_PAYLOAD_INVALID");
    }
    // Do not conceal persistence errors: an uncheckpointed paid response
    // must not be represented as safely resumable.
    await prisma.keywordSuggestionCache.upsert({
      where: { normalized_source: { normalized: key, source } },
      create: { normalized: key, source, payload: JSON.parse(JSON.stringify(value)) },
      update: { payload: JSON.parse(JSON.stringify(value)), fetchedAt: new Date() },
    });
    return value;
  })();

  inflight.set(flightKey, pending);
  try {
    return await pending;
  } finally {
    if (inflight.get(flightKey) === pending) inflight.delete(flightKey);
  }
}
