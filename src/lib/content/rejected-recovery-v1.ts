export type RejectedFailureClassV1 =
  | "INFRA_FAILURE"
  | "BUDGET_FAILURE"
  | "PROGRAMMING_CONTRACT_FAILURE"
  | "EVIDENCE_FAILURE"
  | "RECONCILIATION_FAILURE"
  | "SEMANTIC_OPTIONAL_FAILURE"
  | "SEMANTIC_REQUIRED_FAILURE"
  | "DEPTH_FAILURE"
  | "FINAL_READINESS_FAILURE"
  | "INSUFFICIENT_SERP_DATA";

export type RejectedRecoveryOwnerV1 =
  | "TRANSPORT"
  | "BUDGET"
  | "ENGINEERING"
  | "EVIDENCE"
  | "RECONCILIATION"
  | "SEMANTIC"
  | "DEPTH"
  | "FINAL_READINESS"
  | "SERP";

export type RejectedRecoveryActionV1 =
  | "RETRY_TRANSPORT"
  | "INSPECT_TELEMETRY"
  | "ENGINEERING_FIX"
  | "RETURN_TO_EVIDENCE"
  | "ONE_TARGETED_SECTION_REPAIR"
  | "ONE_DETERMINISTIC_CLEANUP"
  | "RETURN_TO_EVIDENCE_OR_RECONCILIATION"
  | "REPAIR_OWNING_STAGE"
  | "WARN_NO_FAKE_VERDICT";

export interface RejectedRecoveryV1 {
  readonly version: "REJECTED_RECOVERY_V1";

  readonly failureClass: RejectedFailureClassV1;

  readonly owner: RejectedRecoveryOwnerV1;

  readonly nextAction: RejectedRecoveryActionV1;

  readonly autoRetryAllowed: boolean;

  readonly message: string;
}

function messageFrom(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return "Article generation failed";
}

export function classifyRejectedRecoveryV1(
  error: unknown,
): Readonly<RejectedRecoveryV1> {
  /*
   * PERSISTED_RECOVERY_METADATA_NOISE_V1
   *
   * A persisted publishError contains classification metadata, e.g.
   * action=RETURN_TO_EVIDENCE_OR_RECONCILIATION. Re-classifying that
   * whole string accidentally labels a SEMANTIC error as a
   * RECONCILIATION error. Only the original message can be searched
   * for stage ownership, never the transport metadata.
   */
  const rawMessage = messageFrom(error);
  const persisted = rawMessage.match(
    /^REJECTED_RECOVERY_V1\\|class=[A-Z_]+\\|owner=[A-Z_]+\\|action=[A-Z_]+\\|autoRetry=[01]\\|message=(.+)$/s
  );
  const message = persisted?.[1] ?? rawMessage;

  const upper = message.toUpperCase();

  if (
    upper.includes("INSUFFICIENT_SERP_DATA") ||
    upper.includes("INSUFFICIENT_SERP_CONTEXT")
  ) {
    return Object.freeze({
      version: "REJECTED_RECOVERY_V1",

      failureClass: "INSUFFICIENT_SERP_DATA",

      owner: "SERP",

      nextAction: "WARN_NO_FAKE_VERDICT",

      autoRetryAllowed: false,

      message,
    });
  }

  /*
   * Includes provider request-too-large / 413 class.
   * These are not blind-retry failures.
   */
  if (
    upper.includes("CONTENT_LLM_CALL_BUDGET_EXCEEDED") ||
    upper.includes("CONTENT_ESTIMATED_INPUT_TOKEN_BUDGET_EXCEEDED") ||
    upper.includes("CONTENT_REPAIR_BUDGET_EXCEEDED") ||
    upper.includes("CONTENT_PROVIDER_REQUEST_TOO_LARGE") ||
    /(?:OPENAI|GEMINI|GROQ) API ERROR 413\b/i.test(message)
  ) {
    return Object.freeze({
      version: "REJECTED_RECOVERY_V1",

      failureClass: "BUDGET_FAILURE",

      owner: "BUDGET",

      nextAction: "INSPECT_TELEMETRY",

      autoRetryAllowed: false,

      message,
    });
  }

  /*
   * True temporary infrastructure/transport failure.
   */
  if (
    /(?:OPENAI|GEMINI|GROQ) API ERROR (408|409|429|500|502|503|504)\b/i.test(
      message,
    ) ||
    /ABORTERROR|ABORTED|TIMEOUT|TIMED OUT|FETCH FAILED|CONNECTION ERROR|CONNECTION FAILED|CONNECTION RESET|CONNECTION REFUSED|SOCKET HANG UP|NETWORK|ECONN|ENET|EAI_AGAIN|ECONNREFUSED/i.test(
      message,
    ) ||
    /\bP1001\b|\bP1002\b/i.test(message)
  ) {
    return Object.freeze({
      version: "REJECTED_RECOVERY_V1",

      failureClass: "INFRA_FAILURE",

      owner: "TRANSPORT",

      nextAction: "RETRY_TRANSPORT",

      autoRetryAllowed: true,

      message,
    });
  }

  if (
    upper.includes("SECTION_TARGETED_REPAIR_EXHAUSTED:DEPTH") ||
    upper.includes("SECTION_DEPTH_")
  ) {
    return Object.freeze({
      version: "REJECTED_RECOVERY_V1",

      failureClass: "DEPTH_FAILURE",

      owner: "DEPTH",

      nextAction: "REPAIR_OWNING_STAGE",

      autoRetryAllowed: false,

      message,
    });
  }

  if (
    upper.includes("FINAL_READINESS") ||
    upper.includes("FINAL READINESS") ||
    upper.includes("ARTICLE_NEEDS_EDITORIAL_IMPROVEMENT") ||
    upper.includes("COMPREHENSIVE_EDITORIAL_")
  ) {
    return Object.freeze({
      version: "REJECTED_RECOVERY_V1",

      failureClass: "FINAL_READINESS_FAILURE",

      owner: "FINAL_READINESS",

      nextAction: "REPAIR_OWNING_STAGE",

      autoRetryAllowed: false,

      message,
    });
  }

  if (upper.includes("RECONCILIATION")) {
    return Object.freeze({
      version: "REJECTED_RECOVERY_V1",

      failureClass: "RECONCILIATION_FAILURE",

      owner: "RECONCILIATION",

      nextAction: "ONE_TARGETED_SECTION_REPAIR",

      autoRetryAllowed: false,

      message,
    });
  }

  if (
    upper.includes("NO_WRITABLE_SECTIONS") ||
    upper.includes("VERIFIED_EXCERPT") ||
    upper.includes("EVIDENCE_FAILURE") ||
    upper.includes("EVIDENCE_REQUIRED") ||
    upper.includes("EVIDENCE_MISSING") ||
    upper.includes("SECTION_EDITORIAL_EVIDENCE_CAPACITY_INSUFFICIENT") ||
    upper.includes("ARTICLE_PREWRITER_REQUIRED_EVIDENCE_DEFERRED") ||
    upper.includes("ARTICLE_PREWRITER_REQUIRED_COVERAGE_LOST") ||
    upper.includes("LIVE_STAGE_PLAN_INFORMATION_GAIN_UNRESOLVED")
  ) {
    return Object.freeze({
      version: "REJECTED_RECOVERY_V1",

      failureClass: "EVIDENCE_FAILURE",

      owner: "EVIDENCE",

      nextAction: "RETURN_TO_EVIDENCE",

      autoRetryAllowed: false,

      message,
    });
  }

  /*
   * DEPTH_FAILURE_CLASSIFICATION_V1
   *
   * Local section depth recovery normally owns this failure.
   *
   * If that bounded local recovery exhausts and the complete
   * production pass persists REJECTED, Tier-2 may perform its
   * single fresh production retry.
   *
   * Budget errors are classified earlier and therefore cannot
   * be converted into depth recovery here.
   */
  if (
    upper.includes(
      ":DEPTH:"
    ) ||
    upper.includes(
      "SECTION_DEPTH_"
    ) ||
    upper.includes(
      "DEPTH_FAILURE"
    )
  ) {
    return Object.freeze({
      version:
        "REJECTED_RECOVERY_V1",

      failureClass:
        "DEPTH_FAILURE",

      owner:
        "DEPTH",

      nextAction:
        "REPAIR_OWNING_STAGE",

      autoRetryAllowed:
        false,

      message,
    });
  }


  if (upper.includes("SECTION_DETERMINISTIC_SEMANTIC_")) {
    return Object.freeze({
      version: "REJECTED_RECOVERY_V1",

      failureClass: "SEMANTIC_OPTIONAL_FAILURE",

      owner: "SEMANTIC",

      nextAction: "ONE_DETERMINISTIC_CLEANUP",

      autoRetryAllowed: false,

      message,
    });
  }

  /*
   * MASTER_CRITIC_REPAIR_BLOCKED_UNREPAIRABLE_ROUTING_V1
   *
   * INTENT/MISSING_REQUIRED_TOPIC findings are content-quality
   * defects, not engineering contract violations.
   *
   * Route to SEMANTIC owner so targeted repair can be attempted.
   */
  if (
    upper.includes("MASTER_CRITIC_REPAIR_BLOCKED_UNREPAIRABLE") ||
    upper.includes("MISSING_REQUIRED_TOPIC") ||
    upper.includes(":INTENT:")
  ) {
    return Object.freeze({
      version: "REJECTED_RECOVERY_V1",
      failureClass: "SEMANTIC_REQUIRED_FAILURE",
      owner: "SEMANTIC",
      nextAction: "RETURN_TO_EVIDENCE_OR_RECONCILIATION",
      autoRetryAllowed: false,
      message,
    });
  }

  if (
    upper.includes(":SEMANTIC:") ||
    upper.includes("SECTION_SEMANTIC_") ||
    upper.includes("SEMANTIC_VERIFICATION")
  ) {
    return Object.freeze({
      version: "REJECTED_RECOVERY_V1",

      failureClass: "SEMANTIC_REQUIRED_FAILURE",

      owner: "SEMANTIC",

      nextAction: "RETURN_TO_EVIDENCE_OR_RECONCILIATION",

      autoRetryAllowed: false,

      message,
    });
  }

  return Object.freeze({
    version: "REJECTED_RECOVERY_V1",

    failureClass: "PROGRAMMING_CONTRACT_FAILURE",

    owner: "ENGINEERING",

    nextAction: "ENGINEERING_FIX",

    autoRetryAllowed: false,

    message,
  });
}

export function formatRejectedRecoveryForPersistenceV1(
  recovery: Readonly<RejectedRecoveryV1>,
): string {
  const safeMessage = recovery.message
    .replace(/\s+/g, " ")
    .replace(/\|/g, "/")
    .trim()
    .slice(0, 1200);

  return [
    recovery.version,
    `class=${recovery.failureClass}`,
    `owner=${recovery.owner}`,
    `action=${recovery.nextAction}`,
    `autoRetry=${recovery.autoRetryAllowed ? "1" : "0"}`,
    `message=${safeMessage}`,
  ].join("|");
}
