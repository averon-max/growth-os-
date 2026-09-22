import {
  ContentGenerationError,
  type ArticleCriticFinding,
  type ArticleCritiqueResult,
  type ArticleCriticRole,
  type ArticleCriticSeverity,
} from "./generator";

export interface ArticleCritiqueSummary {
  pass:
    boolean;

  findings:
    ArticleCriticFinding[];

  counts: {
    blocker:
      number;

    major:
      number;

    minor:
      number;
  };

  roles:
    ArticleCriticRole[];
}

const SEVERITY_ORDER:
  Record<
    ArticleCriticSeverity,
    number
  > = {
    BLOCKER:
      3,

    MAJOR:
      2,

    MINOR:
      1,
  };

function normalizeText(
  value: string
): string {
  return value
    .trim()
    .replace(
      /\s+/g,
      " "
    );
}

function findingKey(
  finding:
    ArticleCriticFinding
): string {
  return [
    finding.code,
    finding.severity,
    normalizeText(
      finding.evidence
    ),
  ]
    .join(":")
    .toLocaleLowerCase(
      "en-US"
    );
}

export function summarizeArticleCritiques(
  critiques:
    ArticleCritiqueResult[]
): ArticleCritiqueSummary {
  const seen =
    new Set<string>();

  const findings:
    ArticleCriticFinding[] =
      [];

  for (
    const critique
    of critiques
  ) {
    for (
      const finding
      of critique.findings
    ) {
      const normalized:
        ArticleCriticFinding = {
          code:
            normalizeText(
              finding.code
            )
              .toUpperCase()
              .replace(
                /[^A-Z0-9_]+/g,
                "_"
              )
              .slice(
                0,
                80
              ) ||
            "UNSPECIFIED_FINDING",

          severity:
            finding.severity,

          message:
            normalizeText(
              finding.message
            ).slice(
              0,
              500
            ),

          evidence:
            normalizeText(
              finding.evidence
            ).slice(
              0,
              600
            ),

          instruction:
            normalizeText(
              finding.instruction
            ).slice(
              0,
              600
            ),
        };

      const key =
        findingKey(
          normalized
        );

      if (
        seen.has(key)
      ) {
        continue;
      }

      seen.add(key);

      findings.push(
        normalized
      );
    }
  }

  findings.sort(
    (
      left,
      right
    ) =>
      SEVERITY_ORDER[
        right.severity
      ] -
        SEVERITY_ORDER[
          left.severity
        ] ||
      left.code.localeCompare(
        right.code
      )
  );

  const limited =
    findings.slice(
      0,
      30
    );

  const blocker =
    limited.filter(
      (finding) =>
        finding.severity ===
        "BLOCKER"
    ).length;

  const major =
    limited.filter(
      (finding) =>
        finding.severity ===
        "MAJOR"
    ).length;

  const minor =
    limited.filter(
      (finding) =>
        finding.severity ===
        "MINOR"
    ).length;

  return {
    pass:
      blocker ===
        0 &&
      major ===
        0,

    findings:
      limited,

    counts: {
      blocker,
      major,
      minor,
    },

    roles:
      Array.from(
        new Set(
          critiques.map(
            (critique) =>
              critique.role
          )
        )
      ),
  };
}

export function shouldRewriteArticle(
  summary:
    ArticleCritiqueSummary
): boolean {
  return (
    summary.counts.blocker >
      0 ||
    summary.counts.major >
      0
  );
}

export function assertArticleCriticsPassed(
  summary:
    ArticleCritiqueSummary
): void {
  if (
    summary.pass
  ) {
    return;
  }

  const codes =
    summary.findings
      .filter(
        (finding) =>
          finding.severity ===
            "BLOCKER" ||
          finding.severity ===
            "MAJOR"
      )
      .map(
        (finding) =>
          finding.code
      )
      .slice(
        0,
        12
      );

  throw new ContentGenerationError(
    [
      "ARTICLE_CRITIC_GATE_FAILED",
      ...codes,
    ].join(
      ": "
    )
  );
}
