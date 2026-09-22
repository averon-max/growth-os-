import {
  describe,
  expect,
  it,
} from "vitest";

import {
  classifyPageType,
} from "./serp-utils";


describe(
  "SERP page classification",
  () => {
    it(
      "classifies informational how-to pages as guides",
      () => {
        expect(
          classifyPageType(
            "https://example.com/blog/check-email-breach",
            "How to Check If Your Email Was Compromised"
          )
        ).toBe(
          "GUIDE"
        );
      }
    );

    it(
      "classifies real breach checker pages as tools",
      () => {
        expect(
          classifyPageType(
            "https://example.com/breach-detection",
            "Free Data Breach Checker"
          )
        ).toBe(
          "TOOL"
        );
      }
    );

    it(
      "classifies comparison pages",
      () => {
        expect(
          classifyPageType(
            "https://example.com/a-vs-b",
            "Service A vs Service B"
          )
        ).toBe(
          "COMPARISON"
        );
      }
    );

    it(
      "classifies tools",
      () => {
        expect(
          classifyPageType(
            "https://example.com/email-checker",
            "Free Email Breach Checker"
          )
        ).toBe(
          "TOOL"
        );
      }
    );

    it(
      "classifies listicles",
      () => {
        expect(
          classifyPageType(
            "https://example.com/security",
            "10 Best Identity Protection Services"
          )
        ).toBe(
          "LISTICLE"
        );
      }
    );

    it(
      "classifies ordinary blog content as article",
      () => {
        expect(
          classifyPageType(
            "https://example.com/blog/security-news",
            "Security Industry News"
          )
        ).toBe(
          "ARTICLE"
        );
      }
    );
  }
);
