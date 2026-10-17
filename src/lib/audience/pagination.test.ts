import { describe, expect, it } from "vitest";
import { parsePositiveInt } from "./pagination";

describe("Audience positive integer parameter", () => {
  it("preserves defaulting behavior for null, empty, zero and negative values", () => {
    expect(parsePositiveInt(null)).toBeUndefined();
    expect(parsePositiveInt("")).toBeUndefined();
    expect(parsePositiveInt("0")).toBeUndefined();
    expect(parsePositiveInt("-1")).toBeUndefined();
    expect(parsePositiveInt("NaN")).toBeUndefined();
  });
  it("preserves permissive existing parseInt behavior", () => {
    expect(parsePositiveInt("42")).toBe(42);
    expect(parsePositiveInt(" 42 ")).toBe(42);
    expect(parsePositiveInt("12abc")).toBe(12);
  });
});
