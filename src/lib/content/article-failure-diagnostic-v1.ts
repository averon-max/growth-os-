import { classifyRejectedRecoveryV1 } from "./rejected-recovery-v1";

export interface ArticleFailureDiagnosticV1 {
  code: "ARTICLE_RECOVERY_EXHAUSTED";
  failureClass: string;
  owner: string;
  nextAction: string;
  diagnostic: string;
}

/**
 * Report the stored reason of an authenticated user's failed generation.
 * Keep this bounded and strip credential-looking fragments before exposure.
 * Never invent a gate verdict from status alone.
 */
export function describeRejectedArticleV1(
  publishError: string | null | undefined,
): ArticleFailureDiagnosticV1 {
  const source = (publishError ?? "").trim();
  const reason = source || "No persisted rejection reason was available.";
  const classified = classifyRejectedRecoveryV1(new Error(reason));
  const annotated = /\bclass=([A-Z_]+)\|owner=([A-Z_]+)\|action=([A-Z_]+)/.exec(reason);
  const rawMessage = source.startsWith("REJECTED_RECOVERY_V1|") && source.includes("|message=")
    ? source.slice(source.indexOf("|message=") + 9)
    : reason;
  const diagnostic = rawMessage
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "[REDACTED]")
    .replace(/(?:bearer\s+)[A-Za-z0-9._-]{12,}/gi, "Bearer [REDACTED]")
    .replace(/(?:api[_-]?key\s*[:=]\s*)\S+/gi, "api_key=[REDACTED]")
    .replace(/\s+/g, " ")
    .slice(0, 650);
  return {
    code: "ARTICLE_RECOVERY_EXHAUSTED",
    failureClass: annotated?.[1] ?? classified.failureClass,
    owner: annotated?.[2] ?? classified.owner,
    nextAction: annotated?.[3] ?? classified.nextAction,
    diagnostic,
  };
}
