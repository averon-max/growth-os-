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
        "Only a planned Growth OS action can create a content brief.",
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
        "Сначала подтвердите, что бизнес действительно предоставляет продукт, услугу или возможность, связанную с этим запросом.",
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
        "Проверенные данные бизнеса противоречат этому действию.",
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
        "Разрешён только образовательный материал без неподтверждённых продуктовых заявлений.",
    };
  }

  return {
    allowed:
      true,

    reason:
      "Проверенные данные бизнеса разрешают создание страницы.",
  };
}
