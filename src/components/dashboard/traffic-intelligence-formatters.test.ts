import { describe, expect, it } from "vitest";
import { formatNumber, formatBytes, percentage, median, shortDate } from "./traffic-intelligence-formatters";

describe("Traffic dashboard presentation helpers", () => {
  it("preserves compact numbers and byte formatting", () => {
    expect(formatNumber(9999)).toBe("9,999");
    expect(formatNumber(10000)).toBe("10K");
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
    expect(formatBytes(1048576)).toBe("1.0 MB");
  });
  it("preserves no-data and median semantics", () => {
    expect(percentage(5, 0)).toBe("—");
    expect(percentage(1, 4)).toBe("25.0%");
    expect(median([])).toBe(0);
    expect(median([9, 1, 3])).toBe(3);
    expect(median([9, 1, 3, 5])).toBe(4);
  });
  it("preserves UTC day labels", () => {
    expect(shortDate("2026-10-17")).toBe("Oct 17");
  });
});
