import {
  describe,
  expect,
  it,
} from "vitest";

import {
  resolveContentAiProvider,
} from "./gemini-generator";


describe(
  "Content AI provider GPT-only V1",
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
      "accepts explicit OpenAI",
      () => {
        expect(
          resolveContentAiProvider({
            CONTENT_AI_PROVIDER:
              "openai",
          })
        ).toBe(
          "openai"
        );
      }
    );


    it(
      "rejects Gemini production selection",
      () => {
        expect(
          () =>
            resolveContentAiProvider({
              CONTENT_AI_PROVIDER:
                "gemini",
            })
        ).toThrow(
          /GPT-only Content runtime/
        );
      }
    );


    it(
      "rejects Groq production selection",
      () => {
        expect(
          () =>
            resolveContentAiProvider({
              CONTENT_AI_PROVIDER:
                "groq",
            })
        ).toThrow(
          /GPT-only Content runtime/
        );
      }
    );
  }
);
