import {
  describe,
  expect,
  it,
} from "vitest";

import {
  isSameDomain,
} from "./security";

describe("isSameDomain", () => {
  it("accepts identical hostnames", () => {
    expect(
      isSameDomain(
        "https://scanmycreds.com",
        "https://scanmycreds.com/about"
      )
    ).toBe(true);
  });

  it("accepts apex to www redirect", () => {
    expect(
      isSameDomain(
        "https://scanmycreds.com",
        "https://www.scanmycreds.com/"
      )
    ).toBe(true);
  });

  it("accepts www to apex redirect", () => {
    expect(
      isSameDomain(
        "https://www.scanmycreds.com",
        "https://scanmycreds.com/"
      )
    ).toBe(true);
  });

  it("rejects arbitrary subdomains", () => {
    expect(
      isSameDomain(
        "https://scanmycreds.com",
        "https://api.scanmycreds.com"
      )
    ).toBe(false);
  });

  it("rejects suffix lookalike domains", () => {
    expect(
      isSameDomain(
        "https://scanmycreds.com",
        "https://scanmycreds.com.evil.example"
      )
    ).toBe(false);

    expect(
      isSameDomain(
        "https://scanmycreds.com",
        "https://evilscanmycreds.com"
      )
    ).toBe(false);
  });
});
