import { buildSerpReplayArticleFingerprintV1 } from "./serp-replay-fingerprint";
import type { SerpReplayArticleFingerprintInputV1 } from "./serp-replay-fingerprint";
export { buildSerpReplayArticleFingerprintV1 };
export type { SerpReplayArticleFingerprintInputV1 };



import {
  Prisma,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import type {
  SerpReplayV1,
} from "./serp-replay";


export interface PersistSerpReplayArtifactInputV1 {
  contentArticleId:
    string;

  article:
    Readonly<
      SerpReplayArticleFingerprintInputV1
    >;

  replay:
    Readonly<
      SerpReplayV1
    >;
}


export interface PersistSerpReplayFailureArtifactInputV1 {
  contentArticleId:
    string;

  article:
    Readonly<
      SerpReplayArticleFingerprintInputV1
    >;

  keyword?:
    string | null;

  serpSnapshotFingerprint?:
    string | null;

  serpCapturedAt?:
    Date | null;

  errorMessage:
    string;

  provenance?:
    Readonly<
      Record<
        string,
        unknown
      >
    >;
}


function jsonValue(
  value:
    unknown
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(
      value
    )
  ) as Prisma.InputJsonValue;
}


function cleanOptional(
  value:
    string | null | undefined
): string | null {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const clean =
    value.trim();

  return clean ||
    null;
}


export async function createSerpReplayArtifactV1(
  input:
    Readonly<
      PersistSerpReplayArtifactInputV1
    >
) {
  const articleFingerprint =
    buildSerpReplayArticleFingerprintV1(
      input.article
    );


  /*
   * APPEND-ONLY.
   *
   * No lookup.
   * No update.
   * No upsert.
   * Every replay execution creates a new historical artifact.
   */
  return prisma.serpReplayArtifact.create({
    data: {
      contentArticleId:
        input.contentArticleId,

      artifactVersion:
        "SERP_REPLAY_ARTIFACT_V1",

      replayVersion:
        input.replay.version,

      executionStatus:
        "SUCCEEDED",

      replayStatus:
        input.replay.status,

      articleFingerprint,

      articleFingerprintAlgo:
        "SHA256_V1",

      keyword:
        cleanOptional(
          input.replay.keyword
        ),

      serpSnapshotFingerprint:
        cleanOptional(
          input.replay
            .serpSnapshotFingerprint
        ),

      serpCapturedAt:
        input.replay
          .serpCapturedAt,

      comparisons:
        jsonValue(
          input.replay
            .comparisons
        ),

      blockers:
        jsonValue(
          input.replay
            .blockers
        ),

      warnings:
        jsonValue(
          input.replay
            .warnings
        ),

      provenance:
        jsonValue(
          input.replay
            .provenance
        ),

      errorMessage:
        null,
    },
  });
}


export async function createSerpReplayFailureArtifactV1(
  input:
    Readonly<
      PersistSerpReplayFailureArtifactInputV1
    >
) {
  const articleFingerprint =
    buildSerpReplayArticleFingerprintV1(
      input.article
    );


  const errorMessage =
    input.errorMessage
      .trim() ||
    "SERP_REPLAY_EXECUTION_FAILED";


  /*
   * Failed replay attempts are evidence too.
   *
   * Persist the failure as its own append-only artifact instead
   * of pretending the replay returned INSUFFICIENT_CONTEXT or
   * READY.
   */
  return prisma.serpReplayArtifact.create({
    data: {
      contentArticleId:
        input.contentArticleId,

      artifactVersion:
        "SERP_REPLAY_ARTIFACT_V1",

      replayVersion:
        "SERP_REPLAY_V1",

      executionStatus:
        "FAILED",

      replayStatus:
        null,

      articleFingerprint,

      articleFingerprintAlgo:
        "SHA256_V1",

      keyword:
        cleanOptional(
          input.keyword
        ),

      serpSnapshotFingerprint:
        cleanOptional(
          input
            .serpSnapshotFingerprint
        ),

      serpCapturedAt:
        input.serpCapturedAt ??
        null,

      comparisons:
        Prisma.DbNull,

      blockers:
        Prisma.DbNull,

      warnings:
        Prisma.DbNull,

      provenance:
        input.provenance
          ? jsonValue(
              input.provenance
            )
          : Prisma.DbNull,

      errorMessage,
    },
  });
}
