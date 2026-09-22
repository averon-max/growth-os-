import {
  describe,
  expect,
  it,
} from "vitest";

import {
  DEFAULT_GEMINI_CONTENT_MODEL,
  GEMINI_RETRYABLE_STATUS_CODES,
  geminiRetryDelayMs,
  isRetryableGeminiTransportError,
  parseRetryAfterMs,
  resolveGeminiContentModel,
} from "./gemini-reliability";

describe(
  "Gemini reliability",
  () => {
    it(
      "uses content-specific model configuration first",
      () => {
        expect(
          resolveGeminiContentModel({
            GEMINI_CONTENT_MODEL:
              "custom-content-model",

            GEMINI_MODEL:
              "legacy-model",
          })
        ).toBe(
          "custom-content-model"
        );
      }
    );

    it(
      "supports legacy GEMINI_MODEL without changing provenance",
      () => {
        expect(
          resolveGeminiContentModel({
            GEMINI_MODEL:
              "legacy-model",
          })
        ).toBe(
          "legacy-model"
        );
      }
    );

    it(
      "defaults to the declared production model",
      () => {
        expect(
          resolveGeminiContentModel(
            {}
          )
        ).toBe(
          DEFAULT_GEMINI_CONTENT_MODEL
        );
      }
    );

    it(
      "parses Retry-After seconds",
      () => {
        expect(
          parseRetryAfterMs(
            "7"
          )
        ).toBe(
          7000
        );
      }
    );

    it(
      "parses Retry-After HTTP dates",
      () => {
        const now =
          Date.parse(
            "2026-09-20T20:00:00Z"
          );

        expect(
          parseRetryAfterMs(
            "Sun, 20 Sep 2026 20:00:05 GMT",
            now
          )
        ).toBe(
          5000
        );
      }
    );

    it(
      "rejects invalid Retry-After values",
      () => {
        expect(
          parseRetryAfterMs(
            "nonsense"
          )
        ).toBeNull();
      }
    );

    it(
      "uses deterministic exponential backoff at midpoint jitter",
      () => {
        expect(
          geminiRetryDelayMs({
            attempt:
              2,

            randomValue:
              0.5,
          })
        ).toBe(
          8000
        );
      }
    );

    it(
      "caps exponential backoff",
      () => {
        expect(
          geminiRetryDelayMs({
            attempt:
              50,

            randomValue:
              1,
          })
        ).toBe(
          30000
        );
      }
    );

    it(
      "honors Retry-After over exponential backoff",
      () => {
        expect(
          geminiRetryDelayMs({
            attempt:
              5,

            retryAfterHeader:
              "3",

            randomValue:
              1,
          })
        ).toBe(
          3000
        );
      }
    );

    it(
      "marks expected HTTP failures retryable",
      () => {
        for (
          const status
          of [
            429,
            500,
            502,
            503,
            504,
          ]
        ) {
          expect(
            GEMINI_RETRYABLE_STATUS_CODES.has(
              status
            )
          ).toBe(
            true
          );
        }

        expect(
          GEMINI_RETRYABLE_STATUS_CODES.has(
            400
          )
        ).toBe(
          false
        );
      }
    );

    it(
      "retries timeout and network transport failures",
      () => {
        expect(
          isRetryableGeminiTransportError({
            name:
              "AbortError",
          })
        ).toBe(
          true
        );

        expect(
          isRetryableGeminiTransportError(
            new TypeError(
              "fetch failed"
            )
          )
        ).toBe(
          true
        );

        expect(
          isRetryableGeminiTransportError({
            cause: {
              code:
                "ECONNRESET",
            },
          })
        ).toBe(
          true
        );

        expect(
          isRetryableGeminiTransportError(
            new Error(
              "invalid response shape"
            )
          )
        ).toBe(
          false
        );
      }
    );
  }
);
