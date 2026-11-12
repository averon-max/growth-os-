export type OutcomeBriefCompatibility =
  | "SUPPORTED"
  | "EDUCATIONAL_ONLY"
  | "UNVERIFIED"
  | "CONFLICT";

export function evaluateOutcomeCreateBriefPermission({
  decision,
  status,
  compatibilityStatus,
}: {
  decision:
    | "CREATE"
    | "UPDATE"
    | "SKIP";

  status:
    string;

  compatibilityStatus:
    OutcomeBriefCompatibility;
}): {
  allowed:
    boolean;

  reason:
    string;
} {
  if (
    status !==
    "PLANNED"
  ) {
    return {
      allowed:
        false,

      reason:
        "Only a planned Hyprlyx action can create a content brief.",
    };
  }

  if (
    decision !==
    "CREATE"
  ) {
    return {
      allowed:
        false,

      reason:
        "Only CREATE decisions can create a new content brief.",
    };
  }

  if (
    compatibilityStatus ===
    "UNVERIFIED"
  ) {
    return {
      allowed:
        false,

      reason:
        "First confirm the business actually offers the product, service or capability behind this query.",
    };
  }

  if (
    compatibilityStatus ===
    "CONFLICT"
  ) {
    return {
      allowed:
        false,

      reason:
        "Verified business facts contradict this action.",
    };
  }

  if (
    compatibilityStatus ===
    "EDUCATIONAL_ONLY"
  ) {
    return {
      allowed:
        true,

      reason:
        "Only educational content without unverified product claims is allowed.",
    };
  }

  return {
    allowed:
      true,

    reason:
      "Verified business facts allow creating this page.",
  };
}
