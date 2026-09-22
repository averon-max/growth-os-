export const DEFAULT_GEMINI_CONTENT_MODEL =
  "gemini-3.6-flash";

export const GEMINI_RETRYABLE_STATUS_CODES =
  new Set([
    429,
    500,
    502,
    503,
    504,
  ]);

export const GEMINI_BASE_BACKOFF_MS =
  2000;

export const GEMINI_MAX_BACKOFF_MS =
  30000;

export function resolveGeminiContentModel(
  env:
    NodeJS.ProcessEnv =
      process.env
): string {
  const contentModel =
    env
      .GEMINI_CONTENT_MODEL
      ?.trim();

  if (contentModel) {
    return contentModel;
  }

  const legacyModel =
    env
      .GEMINI_MODEL
      ?.trim();

  if (legacyModel) {
    return legacyModel;
  }

  return DEFAULT_GEMINI_CONTENT_MODEL;
}

export function parseRetryAfterMs(
  value:
    string | null,
  nowMs =
    Date.now()
): number | null {
  if (!value) {
    return null;
  }

  const trimmed =
    value.trim();

  if (!trimmed) {
    return null;
  }

  const seconds =
    Number(
      trimmed
    );

  if (
    Number.isFinite(
      seconds
    ) &&
    seconds >=
      0
  ) {
    return Math.min(
      Math.round(
        seconds *
          1000
      ),
      GEMINI_MAX_BACKOFF_MS
    );
  }

  const dateMs =
    Date.parse(
      trimmed
    );

  if (
    !Number.isFinite(
      dateMs
    )
  ) {
    return null;
  }

  return Math.min(
    Math.max(
      0,
      dateMs -
        nowMs
    ),
    GEMINI_MAX_BACKOFF_MS
  );
}

export function geminiRetryDelayMs({
  attempt,
  retryAfterHeader,
  nowMs =
    Date.now(),
  randomValue =
    Math.random(),
}: {
  attempt:
    number;

  retryAfterHeader?:
    string | null;

  nowMs?:
    number;

  randomValue?:
    number;
}): number {
  const retryAfter =
    parseRetryAfterMs(
      retryAfterHeader ??
        null,
      nowMs
    );

  if (
    retryAfter !==
    null
  ) {
    return retryAfter;
  }

  const exponential =
    Math.min(
      GEMINI_BASE_BACKOFF_MS *
        2 **
          Math.max(
            0,
            attempt
          ),
      GEMINI_MAX_BACKOFF_MS
    );

  const boundedRandom =
    Math.min(
      1,
      Math.max(
        0,
        randomValue
      )
    );

  const jitterMultiplier =
    0.75 +
    boundedRandom *
      0.5;

  return Math.min(
    GEMINI_MAX_BACKOFF_MS,
    Math.max(
      250,
      Math.round(
        exponential *
          jitterMultiplier
      )
    )
  );
}

function errorCode(
  error:
    unknown
): string | null {
  if (
    !error ||
    typeof error !==
      "object"
  ) {
    return null;
  }

  const direct =
    (
      error as {
        code?:
          unknown;
      }
    ).code;

  if (
    typeof direct ===
    "string"
  ) {
    return direct;
  }

  const cause =
    (
      error as {
        cause?:
          unknown;
      }
    ).cause;

  if (
    !cause ||
    typeof cause !==
      "object"
  ) {
    return null;
  }

  const nested =
    (
      cause as {
        code?:
          unknown;
      }
    ).code;

  return typeof nested ===
    "string"
    ? nested
    : null;
}

export function isRetryableGeminiTransportError(
  error:
    unknown
): boolean {
  if (
    !error
  ) {
    return false;
  }

  const name =
    typeof error ===
      "object" &&
    "name" in error &&
    typeof (
      error as {
        name?:
          unknown;
      }
    ).name ===
      "string"
      ? (
          error as {
            name:
              string;
          }
        ).name
      : "";

  if (
    name ===
      "AbortError" ||
    name ===
      "TimeoutError"
  ) {
    return true;
  }

  if (
    error instanceof
    TypeError
  ) {
    return true;
  }

  return new Set([
    "ECONNRESET",
    "ETIMEDOUT",
    "EAI_AGAIN",
    "ECONNREFUSED",
    "ENETUNREACH",
    "EHOSTUNREACH",
  ]).has(
    errorCode(
      error
    ) ??
      ""
  );
}

export function geminiTransportErrorMessage(
  error:
    unknown
): string {
  if (
    error instanceof
    Error
  ) {
    return `${error.name}: ${error.message}`
      .slice(
        0,
        300
      );
  }

  return String(
    error
  ).slice(
    0,
    300
  );
}
