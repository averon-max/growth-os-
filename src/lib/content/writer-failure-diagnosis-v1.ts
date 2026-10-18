/**
 * One diagnostic classification for every Writer failure boundary.
 * Safe for private JSONL metadata: never export provider text, prompts,
 * article titles, keywords, paths, or untrusted exception messages.
 *
 * This does NOT decide whether a run should retry and never changes
 * Writer gates or source authority.
 */
export type WriterFailureOwnerV1 =
  | "RESEARCH_PLANNING"
  | "PROVIDER"
  | "WRITER_EDITORIAL"
  | "CMS_PUBLICATION"
  | "PERSISTENCE"
  | "UNKNOWN";

export interface WriterFailureDiagnosisV1 {
  version: "WRITER_FAILURE_DIAGNOSIS_V1";
  reasonCode: string;
  failureClass: WriterFailureOwnerV1;
  recommendedAction:
    | "REPAIR_VERIFIED_RESEARCH_OR_PLAN"
    | "REVIEW_PROVIDER_FAILURE_AND_BUDGET"
    | "INSPECT_GENERATION_OR_CRITIC_TRACE"
    | "REPAIR_CMS_NOT_WRITER"
    | "CHECK_DB_AND_ARTICLE_STATE"
    | "INSPECT_TRACE_BEFORE_RETRY";
  automaticRetry: false;
}

const SAFE_CODE = /^[A-Z][A-Z0-9_]{5,119}$/;
const safeCode = (raw: unknown): string | null =>
  typeof raw === "string" && SAFE_CODE.test(raw) ? raw : null;

export function diagnoseWriterFailureV1(error: unknown): WriterFailureDiagnosisV1 {
  const source = error && typeof error === "object" ? error as {
    code?: unknown; message?: unknown;
  } : null;
  const direct = safeCode(source?.code);
  const message = typeof source?.message === "string" ? source.message : "";
  // The first token can be a stable error identifier. Discard all details
  // (including source URLs or claim text) to prevent accidental leakage.
  const prefix = safeCode(message.split(":")[0]);
  const code = direct ?? prefix ?? "WRITER_UNKNOWN_FAILURE";

  let failureClass: WriterFailureOwnerV1 = "UNKNOWN";
  let recommendedAction: WriterFailureDiagnosisV1["recommendedAction"] =
    "INSPECT_TRACE_BEFORE_RETRY";
  if (/^(?:ARTICLE_PREWRITER_|SECTION_EDITORIAL_|PRODUCTION_MASTER_RUNTIME_|STAGE_PLAN_|CONTENT_EVIDENCE_|ARTICLE_EXECUTION_PLAN_|LIVE_SOURCE_|SERP_)/.test(code)) {
    failureClass = "RESEARCH_PLANNING";
    recommendedAction = "REPAIR_VERIFIED_RESEARCH_OR_PLAN";
  } else if (/^(?:OPENAI_|MODEL_|DATAFORSEO_|PROVIDER_|CONTENT_RUN_BUDGET_)/.test(code)) {
    failureClass = "PROVIDER";
    recommendedAction = "REVIEW_PROVIDER_FAILURE_AND_BUDGET";
  } else if (/^(?:CMS_|PUBLISH_|PUBLISH_FAILED|CONTENT_PUBLISH_)/.test(code)) {
    failureClass = "CMS_PUBLICATION";
    recommendedAction = "REPAIR_CMS_NOT_WRITER";
  } else if (/^(?:PRISMA_|DATABASE_|DB_|P20\d\d)/.test(code)) {
    failureClass = "PERSISTENCE";
    recommendedAction = "CHECK_DB_AND_ARTICLE_STATE";
  } else if (/^(?:ARTICLE_QUALITY_|ARTICLE_READINESS_|CRITIC_|WRITER_|MASTER_WRITER_|SECTION_SEMANTIC_)/.test(code) && code !== "WRITER_UNKNOWN_FAILURE") {
    failureClass = "WRITER_EDITORIAL";
    recommendedAction = "INSPECT_GENERATION_OR_CRITIC_TRACE";
  }

  return Object.freeze({
    version: "WRITER_FAILURE_DIAGNOSIS_V1",
    reasonCode: code,
    failureClass,
    recommendedAction,
    automaticRetry: false as const,
  });
}
