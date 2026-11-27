import { log, logError } from "./logger";

export interface KeywordCandidate {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  score: number; // volume / (difficulty^2) — чем выше тем лучше
  intent: string;
}

export interface KeywordPickerResult {
  winner: KeywordCandidate;
  allCandidates: KeywordCandidate[];
  reason: string;
}

function scoreKeyword(volume: number, difficulty: number): number {
  if (difficulty === 0) return 0;
  return Math.round((volume / Math.pow(difficulty, 2)) * 1000) / 1000;
}

export async function pickBestKeyword(
  seedKeyword: string,
  dataForSeoLogin: string,
  dataForSeoPassword: string
): Promise<KeywordPickerResult> {
  log("keyword-picker", "START", { seedKeyword });

  // 1. Получаем keyword suggestions от DataForSEO
  log("keyword-picker", "FETCH_SUGGESTIONS", {
    endpoint: "dataforseo_labs/google/keyword_suggestions/live",
    seed: seedKeyword,
  });

  const credentials = Buffer.from(`${dataForSeoLogin}:${dataForSeoPassword}`).toString("base64");

  let rawData: unknown;
  try {
    const res = await fetch(
      // Labs suggestions: ~$0.02 for 100 ideas with real keyword difficulty, vs $0.075 for Google Ads ideas.
      "https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/live",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            keyword: seedKeyword,
            language_code: "en",
            location_code: 2840, // USA
            include_seed_keyword: true,
            limit: 100,
          },
        ]),
      }
    );

    rawData = await res.json();
    log("keyword-picker", "RAW_RESPONSE_RECEIVED", {
      status: (rawData as Record<string, unknown>).status_code,
      tasksCount: ((rawData as Record<string, unknown>).tasks as unknown[])?.length,
    });
  } catch (err) {
    logError("keyword-picker", "FETCH_FAILED", err, { seedKeyword });
    throw err;
  }

  // 2. Парсим результаты
  const tasks = (rawData as Record<string, unknown[]>).tasks ?? [];
  const items: Record<string, unknown>[] = [];

  for (const task of tasks as Record<string, unknown>[]) {
    const result = (task.result as Record<string, unknown>[])?.[0];
    if (!result) {
      log("keyword-picker", "TASK_NO_RESULT", { task_id: task.id });
      continue;
    }
    // Labs keeps the numbers in nested objects; flatten them to the shape scored below.
    const flat = (item: Record<string, unknown>, keyword: unknown): Record<string, unknown> => {
      const info = (item.keyword_info ?? {}) as Record<string, unknown>;
      const props = (item.keyword_properties ?? {}) as Record<string, unknown>;
      const intent = (item.search_intent_info ?? {}) as Record<string, unknown>;
      return {
        keyword,
        search_volume: info.search_volume ?? 0,
        keyword_difficulty: props.keyword_difficulty ?? undefined,
        competition_index: typeof info.competition === "number" ? Math.round((info.competition as number) * 100) : undefined,
        cpc: info.cpc ?? 0,
        search_intent: typeof intent.main_intent === "string" ? (intent.main_intent as string).toUpperCase() : "UNKNOWN",
      };
    };
    const seed = result.seed_keyword_data as Record<string, unknown> | null | undefined;
    if (seed) items.push(flat(seed, seedKeyword));
    for (const item of (result.items as Record<string, unknown>[]) ?? []) {
      if (typeof item.keyword === "string" && item.keyword.toLowerCase() !== seedKeyword.toLowerCase()) items.push(flat(item, item.keyword));
    }
  }

  log("keyword-picker", "PARSED_ITEMS", {
    total: items.length,
    sample: items.slice(0, 3).map((i) => ({
      keyword: i.keyword,
      volume: i.search_volume,
      difficulty: i.keyword_difficulty ?? i.competition_index,
    })),
  });

  if (items.length === 0) {
    logError("keyword-picker", "NO_ITEMS", new Error("DataForSEO returned 0 keyword items"), {
      rawTasksCount: tasks.length,
    });
    // fallback — используем seed keyword с нулевыми метриками
    const fallback: KeywordCandidate = {
      keyword: seedKeyword,
      volume: 0,
      difficulty: 1,
      cpc: 0,
      score: 0,
      intent: "UNKNOWN",
    };
    return {
      winner: fallback,
      allCandidates: [fallback],
      reason: "DataForSEO returned no results — using seed keyword as fallback",
    };
  }

  // 3. Скорим каждый keyword
  const candidates: KeywordCandidate[] = items.map((item) => {
    const volume = (item.search_volume as number) ?? 0;
    const difficulty = (item.keyword_difficulty as number) ?? (item.competition_index as number) ?? 50;
    return {
      keyword: item.keyword as string,
      volume,
      difficulty,
      cpc: (item.cpc as number) ?? 0,
      score: scoreKeyword(volume, difficulty),
      intent: (item.search_intent as string) ?? "UNKNOWN",
    };
  });

  // Сортируем по score
  candidates.sort((a, b) => b.score - a.score);

  log("keyword-picker", "SCORED_CANDIDATES", {
    top5: candidates.slice(0, 5).map((c) => ({
      keyword: c.keyword,
      volume: c.volume,
      difficulty: c.difficulty,
      score: c.score,
      intent: c.intent,
    })),
  });

  const winner = candidates[0];
  const reason = `volume=${winner.volume} difficulty=${winner.difficulty} score=${winner.score} — highest volume/difficulty² ratio among ${candidates.length} candidates`;

  log("keyword-picker", "WINNER", { winner, reason });

  return { winner, allCandidates: candidates, reason };
}
