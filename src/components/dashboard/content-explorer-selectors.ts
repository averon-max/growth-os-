/** Pure Keyword/Trend projections for Content Explorer, with original fallback order. */

export interface KeywordPlan {
  keyword: string;

  score?:
    number | null;

  totalScore?:
    number | null;

  volume?:
    number | null;

  searchVolume?:
    number | null;

  difficulty?:
    number | null;

  keywordDifficulty?:
    number | null;

  cpc?:
    number | null;

  position?:
    number | null;

  trend?:
    unknown;

  scoreBreakdown?:
    unknown;

  monthlySearches?:
    unknown;
}

export function asRecord(
  value:
    unknown
): Record<
  string,
  unknown
> {
  return value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
    ? value as Record<
        string,
        unknown
      >
    : {};
}


export function asArray(
  value:
    unknown
): unknown[] {
  return Array.isArray(
    value
  )
    ? value
    : [];
}


export function firstNumber(
  ...values:
    unknown[]
): number | null {
  for (
    const value of
    values
  ) {
    if (
      typeof value ===
        "number" &&
      Number.isFinite(
        value
      )
    ) {
      return value;
    }
  }

  return null;
}


export function formatNumber(
  value:
    number | null
): string {
  if (
    value === null
  ) {
    return "—";
  }

  return new Intl
    .NumberFormat(
      "en-US",
      {
        maximumFractionDigits:
          1,
      }
    )
    .format(
      value
    );
}


export function formatMoney(
  value:
    number | null
): string {
  if (
    value === null
  ) {
    return "—";
  }

  return new Intl
    .NumberFormat(
      "en-US",
      {
        style:
          "currency",

        currency:
          "USD",

        maximumFractionDigits:
          2,
      }
    )
    .format(
      value
    );
}


export function keywordScore(
  keyword:
    KeywordPlan
): number | null {
  const breakdown =
    asRecord(
      keyword
        .scoreBreakdown
    );

  return firstNumber(
    keyword.score,
    keyword.totalScore,
    breakdown.total,
    breakdown.score
  );
}


export function keywordVolume(
  keyword:
    KeywordPlan
): number | null {
  return firstNumber(
    keyword.searchVolume,
    keyword.volume
  );
}


export function keywordDifficulty(
  keyword:
    KeywordPlan
): number | null {
  return firstNumber(
    keyword.keywordDifficulty,
    keyword.difficulty
  );
}


export interface TrendPoint {
  label: string;
  value: number;
}


export function extractTrendPoints(
  keyword:
    KeywordPlan
): TrendPoint[] {
  const trend =
    asRecord(
      keyword.trend
    );

  const candidates =
    [
      trend.monthlySearches,
      trend.monthly,
      trend.points,
      keyword.monthlySearches,
    ];

  let raw:
    unknown[] = [];

  for (
    const candidate of
    candidates
  ) {
    const arr =
      asArray(
        candidate
      );

    if (
      arr.length >
      0
    ) {
      raw =
        arr;

      break;
    }
  }

  return raw
    .map(
      (
        item,
        index
      ) => {
        const row =
          asRecord(
            item
          );

        const value =
          firstNumber(
            row.searchVolume,
            row.volume,
            row.value
          );

        if (
          value === null
        ) {
          return null;
        }

        const year =
          typeof row.year ===
            "number"
            ? row.year
            : null;

        const month =
          typeof row.month ===
            "number"
            ? row.month
            : null;

        const label =
          year !== null &&
          month !== null
            ? `${year}-${String(
                month
              ).padStart(
                2,
                "0"
              )}`
            : String(
                index +
                1
              );

        return {
          label,
          value,
        };
      }
    )
    .filter(
      (
        point
      ): point is TrendPoint =>
        point !==
        null
    )
    .slice(
      -12
    );
}


export function trendMetric(
  keyword:
    KeywordPlan,
  keys:
    string[]
): number | null {
  const trend =
    asRecord(
      keyword.trend
    );

  return firstNumber(
    ...keys.map(
      (key) =>
        trend[key]
    )
  );
}
