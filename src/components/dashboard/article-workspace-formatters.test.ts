import { describe, expect, it } from "vitest";
import {
  slugify, formatNumber, shortDate, statusLabel, positionMove, deltaText,
} from "./article-workspace-formatters";

describe("article workspace presentation helpers", () => {
  it("preserves unicode-safe heading anchors and status text", () => {
    expect(slugify("  Credit — Мониторинг & Alerts  ")).toBe("credit-мониторинг-alerts");
    expect(statusLabel("IN_REVIEW")).toBe("in review");
  });
  it("keeps US numeric/date presentation and null placeholders", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(1234.5)).toBe("1,234.5");
    expect(shortDate("2026-10-17")).toBe("Oct 17");
  });
  it("keeps ranking movement direction and visible deltas", () => {
    expect(positionMove(3.2, 5.5)).toBe(2.3);
    expect(positionMove(null, 5.5)).toBeNull();
    expect(positionMove(5.5, null)).toBeNull();
    expect(deltaText(15, 10)).toBe("+5");
    expect(deltaText(10, 15)).toBe("-5");
    expect(deltaText(15, 15)).toBe("No change");
  });
});
