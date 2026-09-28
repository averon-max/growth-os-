import {
  describe,
  expect,
  it,
} from "vitest";

import {
  resolveContentAiProvider,
  resolveOpenAiContentModel,
  resolveOpenAiReasoningEffort,
} from "./gemini-generator";


describe(
  "content AI provider selection",
  () => {
    it(
      "defaults to OpenAI",
      () => {
        expect(
          resolveContentAiProvider(
            {}
          )
        ).toBe(
          "openai"
        );
      }
    );


    it(
      "normalizes OpenAI configuration",
      () => {
        expect(
          resolveContentAiProvider({
            CONTENT_AI_PROVIDER:
              " OPENAI ",
          })
        ).toBe(
          "openai"
        );
      }
    );


    it(
      "retains Gemini as fallback provider",
      () => {
        expect(
          resolveContentAiProvider({
            CONTENT_AI_PROVIDER:
              "gemini",
          })
        ).toBe(
          "gemini"
        );
      }
    );


    it(
      "does not allow Groq in production selection",
      () => {
        expect(
          () =>
            resolveContentAiProvider({
              CONTENT_AI_PROVIDER:
                "groq",
            })
        ).toThrow(
          /Unsupported CONTENT_AI_PROVIDER/
        );
      }
    );


    it(
      "defaults to Luna",
      () => {
        expect(
          resolveOpenAiContentModel(
            {}
          )
        ).toBe(
          "gpt-5.6-luna"
        );
      }
    );


    it(
      "defaults reasoning to low",
      () => {
        expect(
          resolveOpenAiReasoningEffort(
            {}
          )
        ).toBe(
          "low"
        );
      }
    );


    it(
      "supports none for cheap classifiers",
      () => {
        expect(
          resolveOpenAiReasoningEffort({
            OPENAI_CONTENT_REASONING:
              "none",
          })
        ).toBe(
          "none"
        );
      }
    );
  }
);
