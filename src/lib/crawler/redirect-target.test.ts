import {
  describe,
  expect,
  it,
} from "vitest";

import {
  normalizeRedirectTarget,
} from "./crawler";

describe(
  "redirect target normalization",
  () => {
    it(
      "preserves a meaningful trailing slash from the server",
      () => {
        expect(
          normalizeRedirectTarget(
            "https://www.experian.com/credit/credit-monitoring/"
          )
        ).toBe(
          "https://www.experian.com/credit/credit-monitoring/"
        );
      }
    );

    it(
      "removes fragments and tracking without rewriting the path",
      () => {
        expect(
          normalizeRedirectTarget(
            "https://example.com/path/?utm_source=test#section"
          )
        ).toBe(
          "https://example.com/path/"
        );
      }
    );

    it(
      "rejects unsafe protocols",
      () => {
        expect(
          normalizeRedirectTarget(
            "file:///etc/passwd"
          )
        ).toBeNull();
      }
    );
  }
);
