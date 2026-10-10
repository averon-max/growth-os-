import {
  buildSerpReplayArticleFingerprintV1,
  type SerpReplayArticleFingerprintInputV1,
} from "./serp-replay-fingerprint";


export const EXPLICIT_PUBLISH_GATE_VERSION =
  "EXPLICIT_PUBLISH_GATE_V1" as const;


export type ExplicitPublishGateBlockerCodeV1 =
  | "CONTENT_GATE_FAILED"
  | "PUBLICATION_POLICY_FAILED"
  | "SERP_REPLAY_MISSING"
  | "SERP_REPLAY_EXECUTION_FAILED"
  | "SERP_REPLAY_STATUS_MISSING"
  | "SERP_REPLAY_ARTICLE_FINGERPRINT_MISMATCH";


export type ExplicitPublishGateWarningCodeV1 =
  | "SERP_REPLAY_DIAGNOSTIC_BLOCK"
  | "SERP_REPLAY_DIAGNOSTIC_WARN"
  | "SERP_REPLAY_INSUFFICIENT_CONTEXT";


export interface ExplicitPublishGateReplayArtifactV1 {
  id:
    string;

  executionStatus:
    string;

  replayStatus:
    string | null;

  articleFingerprint:
    string;

  articleFingerprintAlgo:
    string;

  blockers?:
    unknown;

  warnings?:
    unknown;

  createdAt?:
    Date;
}


export interface ExplicitPublishGateInputV1 {
  article:
    Readonly<
      SerpReplayArticleFingerprintInputV1
    >;

  replayArtifact:
    Readonly<
      ExplicitPublishGateReplayArtifactV1
    > |
    null;

  existingGates:
    Readonly<{
      contentGatePassed:
        boolean;

      publicationPolicyPassed:
        boolean;
    }>;
}


export interface ExplicitPublishGateBlockerV1 {
  code:
    ExplicitPublishGateBlockerCodeV1;

  message:
    string;
}


export interface ExplicitPublishGateWarningV1 {
  code:
    ExplicitPublishGateWarningCodeV1;

  message:
    string;
}


export interface ExplicitPublishGateResultV1 {
  version:
    typeof EXPLICIT_PUBLISH_GATE_VERSION;

  pass:
    boolean;

  blockers:
    readonly Readonly<
      ExplicitPublishGateBlockerV1
    >[];

  warnings:
    readonly Readonly<
      ExplicitPublishGateWarningV1
    >[];

  articleFingerprint:
    string;

  replayArtifactId:
    string | null;

  replayStatus:
    string | null;

  /*
   * A successful matching replay artifact is created only after
   * the final Master Critic acceptance boundary in production.
   *
   * This does NOT re-run or duplicate critics.
   */
  masterCriticAcceptanceProvenance:
    | "PROVEN_BY_MATCHING_POST_CRITIC_REPLAY"
    | "UNPROVEN";
}


function uniqueBlockers(
  blockers:
    readonly ExplicitPublishGateBlockerV1[]
): readonly Readonly<
  ExplicitPublishGateBlockerV1
>[] {
  const seen =
    new Set<
      ExplicitPublishGateBlockerCodeV1
    >();


  return Object.freeze(
    blockers.filter(
      (blocker) => {
        if (
          seen.has(
            blocker.code
          )
        ) {
          return false;
        }

        seen.add(
          blocker.code
        );

        return true;
      }
    )
    .map(
      (blocker) =>
        Object.freeze({
          ...blocker,
        })
    )
  );
}


function uniqueWarnings(
  warnings:
    readonly ExplicitPublishGateWarningV1[]
): readonly Readonly<
  ExplicitPublishGateWarningV1
>[] {
  const seen =
    new Set<
      ExplicitPublishGateWarningCodeV1
    >();


  return Object.freeze(
    warnings.filter(
      (warning) => {
        if (
          seen.has(
            warning.code
          )
        ) {
          return false;
        }

        seen.add(
          warning.code
        );

        return true;
      }
    )
    .map(
      (warning) =>
        Object.freeze({
          ...warning,
        })
    )
  );
}


export function evaluateExplicitPublishGateV1(
  input:
    Readonly<
      ExplicitPublishGateInputV1
    >
): Readonly<
  ExplicitPublishGateResultV1
> {
  const blockers:
    ExplicitPublishGateBlockerV1[] =
      [];

  const warnings:
    ExplicitPublishGateWarningV1[] =
      [];


  const currentFingerprint =
    buildSerpReplayArticleFingerprintV1(
      input.article
    );


  if (
    !input.existingGates
      .contentGatePassed
  ) {
    blockers.push({
      code:
        "CONTENT_GATE_FAILED",

      message:
        "The existing deterministic Content Gate did not pass.",
    });
  }


  if (
    !input.existingGates
      .publicationPolicyPassed
  ) {
    blockers.push({
      code:
        "PUBLICATION_POLICY_FAILED",

      message:
        "The existing Article Publication Policy did not pass.",
    });
  }


  const replay =
    input.replayArtifact;


  if (!replay) {
    blockers.push({
      code:
        "SERP_REPLAY_MISSING",

      message:
        "No persisted SERP Replay artifact exists for this article.",
    });
  } else if (
    replay.executionStatus !==
    "SUCCEEDED"
  ) {
    blockers.push({
      code:
        "SERP_REPLAY_EXECUTION_FAILED",

      message:
        "The latest persisted SERP Replay attempt did not complete successfully.",
    });
  } else {
    if (
      replay.articleFingerprintAlgo !==
      "SHA256_V1"
    ) {
      blockers.push({
        code:
          "SERP_REPLAY_ARTICLE_FINGERPRINT_MISMATCH",

        message:
          "The stored SERP Replay uses an unsupported article fingerprint contract.",
      });
    } else if (
      replay.articleFingerprint !==
      currentFingerprint
    ) {
      blockers.push({
        code:
          "SERP_REPLAY_ARTICLE_FINGERPRINT_MISMATCH",

        message:
          "The article changed after the stored SERP Replay was created.",
      });
    }


    if (
      !replay.replayStatus
    ) {
      blockers.push({
        code:
          "SERP_REPLAY_STATUS_MISSING",

        message:
          "The successful SERP Replay artifact has no replay status.",
      });
    } else if (
      replay.replayStatus ===
      "BLOCK"
    ) {
      /*
       * IMPORTANT:
       * SERP Replay BLOCK is a comparative diagnostic, not a
       * ranking prediction and not an automatic publish blocker.
       */
      warnings.push({
        code:
          "SERP_REPLAY_DIAGNOSTIC_BLOCK",

        message:
          "SERP Replay found a concrete comparative gap. Review the stored replay evidence before publishing.",
      });
    } else if (
      replay.replayStatus ===
      "WARN"
    ) {
      warnings.push({
        code:
          "SERP_REPLAY_DIAGNOSTIC_WARN",

        message:
          "SERP Replay contains comparative warnings.",
      });
    } else if (
      replay.replayStatus ===
      "INSUFFICIENT_CONTEXT"
    ) {
      warnings.push({
        code:
          "SERP_REPLAY_INSUFFICIENT_CONTEXT",

        message:
          "SERP Replay completed but available SERP evidence was insufficient for a complete comparison.",
      });
    }
  }


  const criticAcceptanceProven =
    Boolean(
      replay &&
      replay.executionStatus ===
        "SUCCEEDED" &&
      replay.articleFingerprintAlgo ===
        "SHA256_V1" &&
      replay.articleFingerprint ===
        currentFingerprint
    );


  const normalizedBlockers =
    uniqueBlockers(
      blockers
    );

  const normalizedWarnings =
    uniqueWarnings(
      warnings
    );


  return Object.freeze({
    version:
      EXPLICIT_PUBLISH_GATE_VERSION,

    pass:
      normalizedBlockers
        .length ===
      0,

    blockers:
      normalizedBlockers,

    warnings:
      normalizedWarnings,

    articleFingerprint:
      currentFingerprint,

    replayArtifactId:
      replay?.id ??
      null,

    replayStatus:
      replay?.replayStatus ??
      null,

    masterCriticAcceptanceProvenance:
      criticAcceptanceProven
        ? "PROVEN_BY_MATCHING_POST_CRITIC_REPLAY"
        : "UNPROVEN",
  });
}


export class ExplicitPublishGateError
  extends Error {
  readonly result:
    Readonly<
      ExplicitPublishGateResultV1
    >;


  constructor(
    result:
      Readonly<
        ExplicitPublishGateResultV1
      >
  ) {
    super(
      [
        "EXPLICIT_PUBLISH_GATE_BLOCKED",
        ...result.blockers.map(
          (blocker) =>
            blocker.code
        ),
      ].join(
        ":"
      )
    );

    this.name =
      "ExplicitPublishGateError";

    this.result =
      result;
  }
}


export function assertExplicitPublishGatePassedV1(
  result:
    Readonly<
      ExplicitPublishGateResultV1
    >
): void {
  if (
    result.pass
  ) {
    return;
  }

  throw new ExplicitPublishGateError(
    result
  );
}
