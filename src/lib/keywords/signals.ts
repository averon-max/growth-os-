import type { KeywordWithSnapshots, KeywordSignal, SnapshotData } from "./types";

export const QUICK_WIN_MIN_POSITION = 11;
export const QUICK_WIN_MAX_POSITION = 20;
export const QUICK_WIN_MIN_IMPRESSIONS = 100;

export const HIGH_IMPRESSION_LOW_CTR_MIN_IMPRESSIONS = 500;
export const HIGH_IMPRESSION_LOW_CTR_MAX_CTR = 0.03;

export const DECLINING_DAYS = 28;
export const LOST_MIN_DAYS_ABSENT = 14;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function detectQuickWin(keyword: KeywordWithSnapshots, latest: SnapshotData): KeywordSignal[] {
  if (
    latest.position !== undefined &&
    latest.position >= QUICK_WIN_MIN_POSITION &&
    latest.position <= QUICK_WIN_MAX_POSITION &&
    latest.impressions !== undefined &&
    latest.impressions >= QUICK_WIN_MIN_IMPRESSIONS
  ) {
    return [{
      type: "QUICK_WIN",
      keywordId: keyword.id,
      keyword: keyword.text,
      evidence: {
        position: latest.position,
        impressions: latest.impressions,
        date: latest.date.toISOString().slice(0, 10),
      },
    }];
  }
  return [];
}

function detectHighImpressionLowCtr(keyword: KeywordWithSnapshots, latest: SnapshotData): KeywordSignal[] {
  if (
    latest.impressions !== undefined &&
    latest.impressions >= HIGH_IMPRESSION_LOW_CTR_MIN_IMPRESSIONS &&
    latest.ctr !== undefined &&
    latest.ctr <= HIGH_IMPRESSION_LOW_CTR_MAX_CTR
  ) {
    return [{
      type: "HIGH_IMPRESSION_LOW_CTR",
      keywordId: keyword.id,
      keyword: keyword.text,
      evidence: {
        impressions: latest.impressions,
        ctr: latest.ctr,
        date: latest.date.toISOString().slice(0, 10),
      },
    }];
  }
  return [];
}

function detectTrend(keyword: KeywordWithSnapshots, snapshots: SnapshotData[], latest: SnapshotData): KeywordSignal[] {
  const currentWindowStart = new Date(latest.date.getTime() - (DECLINING_DAYS - 1) * MS_PER_DAY);
  const previousWindowEnd = new Date(currentWindowStart.getTime() - MS_PER_DAY);
  const previousWindowStart = new Date(previousWindowEnd.getTime() - (DECLINING_DAYS - 1) * MS_PER_DAY);

  const currentPositions = snapshots
    .filter((s) => s.date >= currentWindowStart && s.date <= latest.date && s.position !== undefined)
    .map((s) => s.position as number);

  const previousPositions = snapshots
    .filter((s) => s.date >= previousWindowStart && s.date <= previousWindowEnd && s.position !== undefined)
    .map((s) => s.position as number);

  const currentAvg = average(currentPositions);
  const previousAvg = average(previousPositions);

  if (currentAvg === null || previousAvg === null || currentAvg === previousAvg) return [];

  const type: "DECLINING" | "GROWING" = currentAvg > previousAvg ? "DECLINING" : "GROWING";

  return [{
    type,
    keywordId: keyword.id,
    keyword: keyword.text,
    evidence: {
      currentAvgPosition: Number(currentAvg.toFixed(2)),
      previousAvgPosition: Number(previousAvg.toFixed(2)),
      currentWindowDays: currentPositions.length,
      previousWindowDays: previousPositions.length,
    },
  }];
}

function detectLost(keyword: KeywordWithSnapshots, snapshots: SnapshotData[], latest: SnapshotData, now: Date): KeywordSignal[] {
  const lastRanked = [...snapshots].reverse().find((s) => s.position !== undefined && s.position <= 100);
  if (!lastRanked) return [];

  const daysSinceLastSnapshot = daysBetween(now, latest.date);
  if (daysSinceLastSnapshot >= LOST_MIN_DAYS_ABSENT) {
    return [{
      type: "LOST",
      keywordId: keyword.id,
      keyword: keyword.text,
      evidence: {
        lastKnownPosition: lastRanked.position as number,
        lastSeenDate: latest.date.toISOString().slice(0, 10),
        daysSinceLastSnapshot,
      },
    }];
  }
  return [];
}

/**
 * Detects actionable signals from keyword snapshot history. Pure —
 * no DB access, no AI. `now` defaults to the real clock but is
 * injectable for deterministic unit tests of the LOST signal.
 */
export function detectSignals(keywords: KeywordWithSnapshots[], now: Date = new Date()): KeywordSignal[] {
  const signals: KeywordSignal[] = [];

  for (const keyword of keywords) {
    const snapshots = [...keyword.snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
    if (snapshots.length === 0) continue;
    const latest = snapshots[snapshots.length - 1];

    signals.push(...detectQuickWin(keyword, latest));
    signals.push(...detectHighImpressionLowCtr(keyword, latest));
    signals.push(...detectTrend(keyword, snapshots, latest));
    signals.push(...detectLost(keyword, snapshots, latest, now));
  }

  return signals;
}
