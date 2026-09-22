import {
  describe,
  expect,
  it,
} from "vitest";

import {
  resolveContentAiProvider,
  resolveGroqContentModel,
} from "./gemini-generator";


describe(
  "content AI provider selection",
  () => {
    it(
      "defaults to Gemini",
      () => {
        expect(
          resolveContentAiProvider(
            {}
          )
        ).toBe(
          "gemini"
        );
      }
    );


    it(
      "selects Groq explicitly",
      () => {
        expect(
          resolveContentAiProvider({
            CONTENT_AI_PROVIDER:
              "groq",
          })
        ).toBe(
          "groq"
        );
      }
    );


    it(
      "normalizes provider casing",
      () => {
        expect(
          resolveContentAiProvider({
            CONTENT_AI_PROVIDER:
              " GROQ ",
          })
        ).toBe(
          "groq"
        );
      }
    );


    it(
      "fails closed for unknown providers",
      () => {
        expect(
          () =>
            resolveContentAiProvider({
              CONTENT_AI_PROVIDER:
                "unknown",
            })
        ).toThrow(
          /Unsupported CONTENT_AI_PROVIDER/
        );
      }
    );


    it(
      "defaults Groq to GPT OSS 120B",
      () => {
        expect(
          resolveGroqContentModel(
            {}
          )
        ).toBe(
          "openai/gpt-oss-120b"
        );
      }
    );


    it(
      "supports explicit Groq model configuration",
      () => {
        expect(
          resolveGroqContentModel({
            GROQ_CONTENT_MODEL:
              "custom/model",
          })
        ).toBe(
          "custom/model"
        );
      }
    );
  }
);
