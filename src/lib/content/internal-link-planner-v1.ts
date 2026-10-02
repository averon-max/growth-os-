import type {
  InternalLinkPlanItem,
} from "./immutable-research-pack";

import type {
  InternalLinkCandidateV1,
} from "./internal-link-candidates-v1";


export interface InternalLinkSectionInputV1 {
  readonly id:
    string;

  readonly heading:
    string;

  readonly mission:
    string;

  readonly topics:
    readonly string[];
}


export interface InternalLinkSectionAssignmentV1 {
  readonly sectionId:
    string;

  readonly targetUrls:
    readonly string[];
}


export interface InternalLinkSelectionV1 {
  readonly version:
    "INTERNAL_LINK_SELECTION_V1";

  /*
   * Existing, actually crawled URLs only.
   */
  readonly approvedTargetUrls:
    readonly string[];

  readonly assignments:
    readonly Readonly<InternalLinkSectionAssignmentV1>[];

  /*
   * A concrete InternalLinkPlanItem requires a real source URL.
   *
   * CREATE pages often do not have their final canonical URL yet,
   * therefore no fake fromUrl is synthesized.
   */
  readonly concretePlan:
    readonly Readonly<InternalLinkPlanItem>[];
}


const STOP_WORDS =
  new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "how",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "the",
    "to",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "with",
    "you",
    "your",
  ]);


function normalize(
  value:
    string
): string {
  return value
    .toLowerCase()
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9\s]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


function tokens(
  value:
    string
): string[] {
  return normalize(
    value
  )
    .split(
      " "
    )
    .filter(
      (
        token
      ) =>
        token.length >=
          3 &&
        !STOP_WORDS.has(
          token
        )
    );
}


function tokenCoverage(
  needle:
    string,
  haystack:
    string
): number {
  const need =
    new Set(
      tokens(
        needle
      )
    );

  const have =
    new Set(
      tokens(
        haystack
      )
    );


  if (
    need.size ===
      0 ||
    have.size ===
      0
  ) {
    return 0;
  }


  let matched =
    0;


  for (
    const token
    of need
  ) {
    if (
      have.has(
        token
      )
    ) {
      matched +=
        1;
    }
  }


  return matched /
    need.size;
}


function validHttpUrl(
  value:
    string
): URL | null {
  try {
    const url =
      new URL(
        value
      );

    if (
      url.protocol !==
        "http:" &&
      url.protocol !==
        "https:"
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}


function canonicalUrlKey(
  value:
    string
): string | null {
  const parsed =
    validHttpUrl(
      value
    );

  if (!parsed) {
    return null;
  }


  parsed.hash =
    "";


  if (
    parsed.pathname !==
    "/"
  ) {
    parsed.pathname =
      parsed.pathname.replace(
        /\/+$/,
        ""
      );
  }


  return parsed
    .toString()
    .toLowerCase();
}


function candidateLabel(
  candidate:
    Readonly<InternalLinkCandidateV1>
): string | null {
  return (
    candidate.h1
      ?.trim() ||
    candidate.title
      ?.trim() ||
    null
  );
}


function candidateSearchText(
  candidate:
    Readonly<InternalLinkCandidateV1>
): string {
  return [
    candidate.title ??
      "",
    candidate.h1 ??
      "",
    ...candidate.h2s,
  ]
    .join(
      " "
    )
    .trim();
}


function candidateEligible(
  candidate:
    Readonly<InternalLinkCandidateV1>,
  siteHostname:
    string
): boolean {
  const url =
    validHttpUrl(
      candidate.url
    );


  if (!url) {
    return false;
  }


  if (
    url.hostname
      .replace(
        /^www\./,
        ""
      )
      .toLowerCase() !==
    siteHostname
      .replace(
        /^www\./,
        ""
      )
      .toLowerCase()
  ) {
    return false;
  }


  if (
    candidate.statusCode !==
      null &&
    (
      candidate.statusCode <
        200 ||
      candidate.statusCode >=
        400
    )
  ) {
    return false;
  }


  if (
    /\bnoindex\b/i.test(
      candidate.robots ??
      ""
    )
  ) {
    return false;
  }


  return Boolean(
    candidateLabel(
      candidate
    )
  );
}


function sectionMatchesCandidate(
  section:
    Readonly<InternalLinkSectionInputV1>,
  candidate:
    Readonly<InternalLinkCandidateV1>
): boolean {
  const candidateText =
    candidateSearchText(
      candidate
    );


  /*
   * Topic ownership is strongest.
   */
  if (
    section.topics.some(
      (
        topic
      ) =>
        tokenCoverage(
          topic,
          candidateText
        ) >=
        0.75
    )
  ) {
    return true;
  }


  /*
   * Heading/mission fallback is intentionally strict enough to avoid
   * linking merely because two pages share the broad parent entity.
   */
  return (
    tokenCoverage(
      section.heading,
      candidateText
    ) >=
      0.75 ||
    (
      tokens(
        section.mission
      ).length >=
        3 &&
      tokenCoverage(
        section.mission,
        candidateText
      ) >=
        0.75
    )
  );
}


export function buildInternalLinkSelectionV1({
  siteHostname,
  articleTargetUrl,
  candidates,
  sections,
}: {
  readonly siteHostname:
    string;

  readonly articleTargetUrl?:
    string |
    null;

  readonly candidates:
    readonly Readonly<InternalLinkCandidateV1>[];

  readonly sections:
    readonly Readonly<InternalLinkSectionInputV1>[];
}): Readonly<InternalLinkSelectionV1> {
  const articleUrlKey =
    articleTargetUrl
      ? canonicalUrlKey(
          articleTargetUrl
        )
      : null;


  const eligible =
    candidates
      .filter(
        (
          candidate
        ) =>
          candidateEligible(
            candidate,
            siteHostname
          )
      )
      .filter(
        (
          candidate
        ) => {
          const candidateKey =
            canonicalUrlKey(
              candidate.url
            );

          return (
            candidateKey !==
              null &&
            candidateKey !==
              articleUrlKey
          );
        }
      );


  const assignments =
    sections.map(
      (
        section
      ) => {
        const targetUrls =
          [
            ...new Set(
              eligible
                .filter(
                  (
                    candidate
                  ) =>
                    sectionMatchesCandidate(
                      section,
                      candidate
                    )
                )
                .map(
                  (
                    candidate
                  ) =>
                    candidate.url
                )
            ),
          ];


        return Object.freeze({
          sectionId:
            section.id,

          targetUrls:
            Object.freeze(
              targetUrls
            ),
        });
      }
    );


  const approvedTargetUrls =
    [
      ...new Set(
        assignments.flatMap(
          (
            assignment
          ) =>
            assignment
              .targetUrls
        )
      ),
    ];


  /*
   * Never fabricate the source URL of a not-yet-published article.
   */
  const concretePlan:
    InternalLinkPlanItem[] =
      [];


  if (
    articleTargetUrl &&
    validHttpUrl(
      articleTargetUrl
    )
  ) {
    for (
      const toUrl
      of approvedTargetUrls
    ) {
      const candidate =
        eligible.find(
          (
            item
          ) =>
            item.url ===
            toUrl
        );


      if (!candidate) {
        continue;
      }


      concretePlan.push({
        fromUrl:
          articleTargetUrl,

        toUrl,

        anchor:
          candidateLabel(
            candidate
          ) ??
          undefined,

        reason:
          "Existing crawled page is semantically relevant to an assigned article information job.",
      });
    }
  }


  return Object.freeze({
    version:
      "INTERNAL_LINK_SELECTION_V1",

    approvedTargetUrls:
      Object.freeze(
        approvedTargetUrls
      ),

    assignments:
      Object.freeze(
        assignments
      ),

    concretePlan:
      Object.freeze(
        concretePlan
      ),
  });
}
