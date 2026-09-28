import type {
  SectionGenerationContractV1,
} from "./article-generation-contract";

import type {
  GeneratedSectionV1,
} from "./master-article-generator";

import type {
  SectionSemanticVerificationV1,
} from "./master-section-semantic-verifier";

import {
  extractSectionSemanticProseUnitsV1,
} from "./master-section-semantic-verifier";

import {
  ContentGenerationError,
} from "./generator";


function cleanMarkdownAfterDeletion(
  markdown:
    string
): string {
  const lines =
    markdown
      .split("\n")
      .map(
        (
          line
        ) => {
          /*
           * Deleting a semantic unit from a list item may leave
           * only its markdown marker.
           */
          if (
            /^\s*(?:[-*+]\s*|\d+\.\s*)$/.test(
              line
            )
          ) {
            return "";
          }


          /*
           * Never leave an empty markdown heading marker.
           */
          if (
            /^\s*#{3,6}\s*$/.test(
              line
            )
          ) {
            return "";
          }


          return line
            .replace(
              /[ \t]+$/g,
              ""
            );
        }
      );


  /*
   * Remove H3+ headings that no longer own any actual content
   * before the next heading.
   */
  for (
    let index = 0;
    index <
    lines.length;
    index++
  ) {
    if (
      !/^\s*#{3,6}\s+\S/.test(
        lines[index] ??
        ""
      )
    ) {
      continue;
    }


    let hasContent =
      false;


    for (
      let cursor =
        index + 1;
      cursor <
      lines.length;
      cursor++
    ) {
      const next =
        lines[cursor] ??
        "";


      if (
        /^\s*#{3,6}\s+\S/.test(
          next
        )
      ) {
        break;
      }


      if (
        next.trim()
          .length >
        0
      ) {
        hasContent =
          true;

        break;
      }
    }


    if (!hasContent) {
      lines[index] =
        "";
    }
  }


  return lines
    .join("\n")
    .replace(
      /[ \t]+\n/g,
      "\n"
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
}


function markdownVariants(
  text:
    string
): readonly string[] {
  /*
   * DETERMINISTIC_MARKDOWN_EQUIVALENCE_V1
   *
   * The semantic extractor removes inline markdown emphasis.
   * Repair maps the exact semantic text back to deterministic
   * formatting variants only.
   *
   * NO fuzzy similarity.
   * NO semantic guessing.
   */

  const variants:
    string[] =
      [];

  const directAnswer =
    /^Direct answer:\s*(.+)$/i.exec(
      text
    );

  if (
    directAnswer?.[1]
  ) {
    variants.push(
      `**Direct answer:** ${
        directAnswer[1]
      }`
    );
  }


  const tokens =
    Array.from(
      text.matchAll(
        /\S+/g
      )
    );

  /*
   * Covers writer patterns such as:
   *
   * **Credit monitoring** is...
   * **Scope** – ...
   * **How it works** – ...
   * **What to do next** – ...
   */
  const maxPrefixTokens =
    Math.min(
      tokens.length,
      12
    );

  for (
    let count = 1;
    count <=
      maxPrefixTokens;
    count++
  ) {
    const token =
      tokens[
        count -
        1
      ];

    if (
      !token ||
      typeof token.index !==
        "number"
    ) {
      continue;
    }

    const boundary =
      token.index +
      token[0].length;

    const prefix =
      text.slice(
        0,
        boundary
      );

    const suffix =
      text.slice(
        boundary
      );

    variants.push(
      `**${prefix}**${suffix}`,
      `__${prefix}__${suffix}`,
      `*${prefix}*${suffix}`,
      `_${prefix}_${suffix}`,
      `\`${prefix}\`${suffix}`
    );
  }

  return Array.from(
    new Set(
      variants
    )
  );
}


function deleteExactSemanticUnit({
  markdown,
  text,
  unitId,
}: {
  markdown:
    string;

  text:
    string;

  unitId:
    string;
}): string {
  const candidates =
    [
      text,
      ...markdownVariants(
        text
      ),
    ];


  for (
    const candidate
    of candidates
  ) {
    const index =
      markdown.indexOf(
        candidate
      );


    if (
      index <
      0
    ) {
      continue;
    }


    return (
      markdown.slice(
        0,
        index
      ) +
      markdown.slice(
        index +
        candidate.length
      )
    );
  }


  /*
   * Fail closed.
   *
   * If the verifier unit cannot be mapped back to the exact
   * source markdown, do not attempt fuzzy destructive editing.
   */
  throw new ContentGenerationError(
    `SECTION_DETERMINISTIC_SEMANTIC_TARGET_NOT_FOUND:${unitId}`
  );
}


export function deterministicSemanticDeleteRepairV1({
  contract,
  section,
  verification,
}: {
  contract:
    Readonly<
      SectionGenerationContractV1
    >;

  section:
    Readonly<
      GeneratedSectionV1
    >;

  verification:
    Readonly<
      SectionSemanticVerificationV1
    >;
}): Readonly<
  GeneratedSectionV1
> {
  if (
    verification.status !==
    "BLOCK"
  ) {
    throw new ContentGenerationError(
      "SECTION_DETERMINISTIC_SEMANTIC_REPAIR_NOT_BLOCKED"
    );
  }


  /*
   * We are allowed to delete unsupported prose only when every
   * required claim already has at least one surviving verified
   * semantic representation.
   *
   * Otherwise deletion could leave structured claim references
   * without actual reader-facing claim prose.
   */
  const survivingSupportedClaims =
    new Set(
      verification
        .units
        .filter(
          (
            unit
          ) =>
            (
              unit.classification ===
                "SUPPORTED" ||
              unit.classification ===
                "NARROWER"
            ) &&
            Boolean(
              unit.matchedClaimId
            )
        )
        .map(
          (
            unit
          ) =>
            unit.matchedClaimId
        )
        .filter(
          (
            value
          ): value is string =>
            typeof value ===
              "string" &&
            value.length >
              0
        )
    );


  for (
    const claimId
    of contract.blueprint
      .requiredClaims ??
    []
  ) {
    if (
      !survivingSupportedClaims.has(
        claimId
      )
    ) {
      throw new ContentGenerationError(
        `SECTION_DETERMINISTIC_SEMANTIC_REQUIRED_CLAIM_NOT_SURVIVING:${claimId}`
      );
    }
  }


  const extractedUnits =
    extractSectionSemanticProseUnitsV1({
      sectionIndex:
        contract.sectionIndex,

      bodyMarkdown:
        section.bodyMarkdown,
    });


  const unitMap =
    new Map(
      extractedUnits.map(
        (
          unit
        ) => [
          unit.id,
          unit,
        ] as const
      )
    );


  const blocked =
    verification
      .units
      .filter(
        (
          unit
        ) =>
          unit.classification ===
            "UNSUPPORTED" ||
          unit.classification ===
            "CONTRADICTED"
      );


  if (
    blocked.length ===
    0
  ) {
    throw new ContentGenerationError(
      "SECTION_DETERMINISTIC_SEMANTIC_BLOCKERS_MISSING"
    );
  }


  let bodyMarkdown =
    section.bodyMarkdown;


  /*
   * Delete from longest text to shortest.
   * This prevents a short unit from accidentally consuming text
   * contained inside a longer blocked unit.
   */
  const targets =
    blocked
      .map(
        (
          result
        ) => {
          const unit =
            unitMap.get(
              result.unitId
            );


          if (!unit) {
            throw new ContentGenerationError(
              `SECTION_DETERMINISTIC_SEMANTIC_UNIT_NOT_FOUND:${result.unitId}`
            );
          }


          return {
            unitId:
              result.unitId,

            text:
              unit.text,
          };
        }
      )
      .sort(
        (
          left,
          right
        ) =>
          right.text.length -
          left.text.length
      );


  for (
    const target
    of targets
  ) {
    bodyMarkdown =
      deleteExactSemanticUnit({
        markdown:
          bodyMarkdown,

        text:
          target.text,

        unitId:
          target.unitId,
      });
  }


  bodyMarkdown =
    cleanMarkdownAfterDeletion(
      bodyMarkdown
    );


  if (
    bodyMarkdown.length ===
    0
  ) {
    throw new ContentGenerationError(
      "SECTION_DETERMINISTIC_SEMANTIC_REPAIR_EMPTIED_SECTION"
    );
  }


  /*
   * No IDs are invented or changed.
   *
   * Required claims/evidence were already validated and their
   * surviving semantic representation was checked above.
   */
  return Object.freeze({
    ...section,

    bodyMarkdown,
  });
}
