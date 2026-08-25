import { describe, it, expect } from "vitest";
import { detectSignals } from "./signals";
import type { KeywordWithSnapshots, SnapshotData } from "./types";

const NOW = new Date("2026-06-15T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function daysBefore(date: Date, days: number): Date {
  return new Date(date.getTime() - days * DAY_MS);
}

function snapshot(overrides: Partial<SnapshotData> & { date: Date }): SnapshotData {
  return {
    device: "DESKTOP",
    country: "us",
    source: "GOOGLE_SEARCH_CONSOLE",
    retrievedAt: overrides.date,
    ...overrides,
  };
}

function keyword(id: string, snapshots: SnapshotData[]): KeywordWithSnapshots {
  return {
    id,
    workspaceId: "ws-1",
    text: `keyword ${id}`,
    normalized: `keyword ${id}`,
    snapshots,
  };
}

describe("detectSignals", () => {
  it("detects QUICK_WIN when position is 11-20 with enough impressions", () => {
    const kw = keyword("k1", [snapshot({ date: NOW, position: 15, impressions: 200 })]);
    const signals = detectSignals([kw], NOW);
    const quickWins = signals.filter((s) => s.type === "QUICK_WIN");
    expect(quickWins).toHaveLength(1);
    expect(quickWins[0].evidence.position).toBe(15);
    expect(quickWins[0].evidence.impressions).toBe(200);
  });

  it("does not detect QUICK_WIN when position is better than the band", () => {
    const kw = keyword("k2", [snapshot({ date: NOW, position: 5, impressions: 200 })]);
    const signals = detectSignals([kw], NOW);
    expect(signals.filter((s) => s.type === "QUICK_WIN")).toHaveLength(0);
  });

  it("does not detect QUICK_WIN when impressions are below threshold", () => {
    const kw = keyword("k3", [snapshot({ date: NOW, position: 15, impressions: 50 })]);
    const signals = detectSignals([kw], NOW);
    expect(signals.filter((s) => s.type === "QUICK_WIN")).toHaveLength(0);
  });

  it("detects HIGH_IMPRESSION_LOW_CTR when impressions are high and ctr is low", () => {
    const kw = keyword("k4", [snapshot({ date: NOW, impressions: 1000, ctr: 0.01 })]);
    const signals = detectSignals([kw], NOW);
    const hits = signals.filter((s) => s.type === "HIGH_IMPRESSION_LOW_CTR");
    expect(hits).toHaveLength(1);
    expect(hits[0].evidence.impressions).toBe(1000);
    expect(hits[0].evidence.ctr).toBe(0.01);
  });

  it("does not detect HIGH_IMPRESSION_LOW_CTR when ctr is above threshold", () => {
    const kw = keyword("k5", [snapshot({ date: NOW, impressions: 1000, ctr: 0.05 })]);
    const signals = detectSignals([kw], NOW);
    expect(signals.filter((s) => s.type === "HIGH_IMPRESSION_LOW_CTR")).toHaveLength(0);
  });

  it("detects DECLINING when position worsens vs the prior 28-day window", () => {
    const kw = keyword("k6", [
      snapshot({ date: daysBefore(NOW, 28), position: 8 }),
      snapshot({ date: NOW, position: 15 }),
    ]);
    const signals = detectSignals([kw], NOW);
    const declining = signals.filter((s) => s.type === "DECLINING");
    expect(declining).toHaveLength(1);
    expect(declining[0].evidence.previousAvgPosition).toBe(8);
    expect(declining[0].evidence.currentAvgPosition).toBe(15);
  });

  it("detects GROWING when position improves vs the prior 28-day window", () => {
    const kw = keyword("k7", [
      snapshot({ date: daysBefore(NOW, 28), position: 15 }),
      snapshot({ date: NOW, position: 8 }),
    ]);
    const signals = detectSignals([kw], NOW);
    const growing = signals.filter((s) => s.type === "GROWING");
    expect(growing).toHaveLength(1);
    expect(growing[0].evidence.previousAvgPosition).toBe(15);
    expect(growing[0].evidence.currentAvgPosition).toBe(8);
  });

  it("detects LOST when the last snapshot is 20+ days old and was once ranked", () => {
    const kw = keyword("k8", [snapshot({ date: daysBefore(NOW, 20), position: 50 })]);
    const signals = detectSignals([kw], NOW);
    const lost = signals.filter((s) => s.type === "LOST");
    expect(lost).toHaveLength(1);
    expect(lost[0].evidence.lastKnownPosition).toBe(50);
    expect(lost[0].evidence.daysSinceLastSnapshot).toBe(20);
  });

  it("does not detect LOST when the last snapshot is only 5 days old", () => {
    const kw = keyword("k9", [snapshot({ date: daysBefore(NOW, 5), position: 50 })]);
    const signals = detectSignals([kw], NOW);
    expect(signals.filter((s) => s.type === "LOST")).toHaveLength(0);
  });

  it("gives every detected signal an evidence object with numeric metrics", () => {
    const keywords = [
      keyword("k10", [snapshot({ date: NOW, position: 15, impressions: 200 })]),
      keyword("k11", [snapshot({ date: NOW, impressions: 1000, ctr: 0.01 })]),
      keyword("k12", [
        snapshot({ date: daysBefore(NOW, 28), position: 8 }),
        snapshot({ date: NOW, position: 15 }),
      ]),
      keyword("k13", [snapshot({ date: daysBefore(NOW, 20), position: 50 })]),
    ];

    const signals = detectSignals(keywords, NOW);
    expect(signals.length).toBeGreaterThan(0);

    for (const signal of signals) {
      expect(typeof signal.evidence).toBe("object");
      const numericValues = Object.values(signal.evidence).filter((v) => typeof v === "number");
      expect(numericValues.length).toBeGreaterThan(0);
    }
  });
});
