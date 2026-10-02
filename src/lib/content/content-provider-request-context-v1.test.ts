import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  recordContentProviderRequestV1,
  runWithContentProviderDispatchMetaV1,
  runWithContentProviderRequestContextV1,
  type ContentProviderRequestChargeV1,
} from "./content-provider-request-context-v1";


const previousProvider =
  process.env.CONTENT_AI_PROVIDER;

const previousTelemetry =
  process.env.CONTENT_PROVIDER_TELEMETRY;


afterEach(
  () => {
    if (
      previousProvider ===
      undefined
    ) {
      delete process.env
        .CONTENT_AI_PROVIDER;
    } else {
      process.env
        .CONTENT_AI_PROVIDER =
          previousProvider;
    }


    if (
      previousTelemetry ===
      undefined
    ) {
      delete process.env
        .CONTENT_PROVIDER_TELEMETRY;
    } else {
      process.env
        .CONTENT_PROVIDER_TELEMETRY =
          previousTelemetry;
    }
  }
);


describe(
  "ContentProviderRequestContextV1",
  () => {
    it(
      "marks continuation and retry on the physical request",
      () => {
        process.env
          .CONTENT_AI_PROVIDER =
            "openai";

        process.env
          .CONTENT_PROVIDER_TELEMETRY =
            "0";


        const charges:
          Readonly<ContentProviderRequestChargeV1>[] =
            [];


        const budget = {
          consumeProviderRequest(
            input:
              Readonly<ContentProviderRequestChargeV1>
          ) {
            charges.push(
              input
            );
          },
        };


        runWithContentProviderRequestContextV1(
          {
            budget,

            stage:
              "verifySectionClaims",

            logicalCallId:
              "verifySectionClaims:7",
          },

          () =>
            runWithContentProviderDispatchMetaV1(
              {
                continuation:
                  true,
              },

              () =>
                recordContentProviderRequestV1({
                  provider:
                    "openai",

                  model:
                    "gpt-test",

                  attempt:
                    2,

                  prompt:
                    "abcdefgh",
                })
            )
        );


        expect(
          charges
        ).toHaveLength(
          1
        );


        expect(
          charges[0]
        ).toMatchObject({
          stage:
            "verifySectionClaims",

          logicalCallId:
            "verifySectionClaims:7",

          provider:
            "openai",

          attempt:
            2,

          retry:
            true,

          continuation:
            true,

          failover:
            false,

          promptChars:
            8,

          estimatedInputTokens:
            2,
        });
      }
    );


    it(
      "marks alternate provider dispatch as failover",
      () => {
        process.env
          .CONTENT_AI_PROVIDER =
            "openai";

        process.env
          .CONTENT_PROVIDER_TELEMETRY =
            "0";


        const charges:
          Readonly<ContentProviderRequestChargeV1>[] =
            [];


        runWithContentProviderRequestContextV1(
          {
            budget: {
              consumeProviderRequest(
                input
              ) {
                charges.push(
                  input
                );
              },
            },

            stage:
              "generateSection",

            logicalCallId:
              "generateSection:2",
          },

          () =>
            recordContentProviderRequestV1({
              provider:
                "gemini",

              model:
                "gemini-test",

              attempt:
                1,

              prompt:
                "1234",
            })
        );


        expect(
          charges[0]
        ).toMatchObject({
          retry:
            false,

          continuation:
            false,

          failover:
            true,
        });
      }
    );
  }
);
