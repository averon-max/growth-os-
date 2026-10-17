import { describe, expect, it } from "vitest";
import { ALLOWED_AUDIENCE_DAYS, getCompletedUtcDayRange } from "./completed-day-range";

describe("last completed UTC days", () => {
  it("retains the 7/15/30 choices without widening API ranges", () => {
    expect([...ALLOWED_AUDIENCE_DAYS]).toEqual([7, 15, 30]);
    expect(ALLOWED_AUDIENCE_DAYS.has(28)).toBe(false);
  });

  it("excludes the current UTC day for the 7-day view", () => {
    const { since, until } = getCompletedUtcDayRange(
      7, new Date("2026-10-17T23:59:59.000Z")
    );
    expect(since.toISOString()).toBe("2026-10-10T00:00:00.000Z");
    expect(until.toISOString()).toBe("2026-10-16T00:00:00.000Z");
  });

  it("keeps 30-day Cloudflare sync across month/leap-day boundaries", () => {
    const { since, until } = getCompletedUtcDayRange(
      30, new Date("2024-03-01T01:25:00.000Z")
    );
    expect(since.toISOString()).toBe("2024-01-31T00:00:00.000Z");
    expect(until.toISOString()).toBe("2024-02-29T00:00:00.000Z");
  });

  it("uses UTC independent of timestamp timezone offsets", () => {
    const range = getCompletedUtcDayRange(
      15, new Date("2026-01-01T00:15:00+05:00")
    );
    expect(range.until.toISOString()).toBe("2025-12-30T00:00:00.000Z");
    expect(range.since.toISOString()).toBe("2025-12-16T00:00:00.000Z");
  });
});
