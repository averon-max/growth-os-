import {
  createHash,
} from "node:crypto";

import {
  prisma,
} from "@/lib/prisma";

import {
  fetchSinglePage,
  type CrawledPage,
} from "@/lib/crawler/crawler";


export type EvidenceFreshnessStatus =
  | "UNCHECKED"
  | "FRESH"
  | "DRIFTED"
  | "UNAVAILABLE";


export interface EvidenceDriftCheckResult {
  total: number;
  checked: number;
  fresh: number;
  drifted: number;
  unavailable: number;
  unchanged: number;
  sourceFetches: number;
}


interface SourceFetchResult {
  page: CrawledPage | null;
  error: string | null;
}


export function normalizeEvidenceText(
  value: string
): string {
  return value
    .replace(
      /\s+/g,
      " "
    )
    .trim()
    .toLowerCase();
}


export function hashEvidenceText(
  value: string
): string {
  return createHash(
    "sha256"
  )
    .update(
      normalizeEvidenceText(
        value
      ),
      "utf8"
    )
    .digest(
      "hex"
    );
}


export function hashSourceContent(
  value: string
): string {
  return createHash(
    "sha256"
  )
    .update(
      normalizeEvidenceText(
        value
      ),
      "utf8"
    )
    .digest(
      "hex"
    );
}


export function sourceContainsEvidence({
  bodyText,
  evidence,
}: {
  bodyText: string;
  evidence: string;
}): boolean {
  const normalizedBody =
    normalizeEvidenceText(
      bodyText
    );

  const normalizedEvidence =
    normalizeEvidenceText(
      evidence
    );

  if (
    normalizedEvidence.length ===
    0
  ) {
    return false;
  }

  return normalizedBody.includes(
    normalizedEvidence
  );
}


async function persistEvidenceState({
  fact,
  nextStatus,
  evidenceHash,
  sourceContentHash,
  checkedAt,
  error,
  page,
}: {
  fact: {
    id: string;
    sourceUrl: string | null;
    evidenceStatus: EvidenceFreshnessStatus;
  };
  nextStatus: EvidenceFreshnessStatus;
  evidenceHash: string;
  sourceContentHash?: string;
  checkedAt: Date;
  error?: string;
  page?: CrawledPage;
}): Promise<boolean> {
  const changed =
    fact.evidenceStatus !==
    nextStatus;

  await prisma.$transaction(
    async (
      tx
    ) => {
      await tx.businessFact.update({
        where: {
          id:
            fact.id,
        },

        data: {
          evidenceStatus:
            nextStatus,

          evidenceHash,

          lastEvidenceCheckedAt:
            checkedAt,

          evidenceCheckError:
            error
              ? error.slice(
                  0,
                  500
                )
              : null,

          ...(
            sourceContentHash
              ? {
                  sourceContentHash,
                }
              : {}
          ),

          ...(
            nextStatus ===
            "FRESH"
              ? {
                  lastEvidenceSeenAt:
                    checkedAt,
                }
              : {}
          ),
        },
      });

      if (!changed) {
        return;
      }

      const metadata:
        Record<
          string,
          string | number | boolean
        > = {
          previousEvidenceStatus:
            fact.evidenceStatus,

          nextEvidenceStatus:
            nextStatus,

          evidenceHash,

          sourceUrl:
            fact.sourceUrl ??
            "",
        };

      if (
        sourceContentHash
      ) {
        metadata.sourceContentHash =
          sourceContentHash;
      }

      if (error) {
        metadata.error =
          error.slice(
            0,
            500
          );
      }

      if (page) {
        metadata.finalUrl =
          page.url;

        metadata.statusCode =
          page.statusCode;

        metadata.redirected =
          Boolean(
            page.redirectedFrom
          );
      }

      await tx.businessFactEvent.create({
        data: {
          businessFactId:
            fact.id,

          action:
            `EVIDENCE_${nextStatus}`,

          previousStatus:
            "VERIFIED",

          nextStatus:
            "VERIFIED",

          metadata,
        },
      });
    }
  );

  return changed;
}


export async function checkVerifiedBusinessFactEvidence({
  businessId,
}: {
  businessId: string;
}): Promise<EvidenceDriftCheckResult> {
  const facts =
    await prisma.businessFact.findMany({
      where: {
        businessId,

        status:
          "VERIFIED",
      },

      select: {
        id:
          true,

        sourceUrl:
          true,

        evidence:
          true,

        evidenceStatus:
          true,
      },

      orderBy: {
        createdAt:
          "asc",
      },
    });


  const sourceCache =
    new Map<
      string,
      Promise<SourceFetchResult>
    >();


  const fetchSource = (
    sourceUrl: string
  ): Promise<SourceFetchResult> => {
    const existing =
      sourceCache.get(
        sourceUrl
      );

    if (existing) {
      return existing;
    }

    const promise =
      fetchSinglePage(
        sourceUrl
      )
        .then(
          (
            page
          ): SourceFetchResult => ({
            page,
            error:
              page.error ??
              null,
          })
        )
        .catch(
          (
            err:
              unknown
          ): SourceFetchResult => ({
            page:
              null,

            error:
              err instanceof Error
                ? err.message
                : "Unknown source fetch error",
          })
        );

    sourceCache.set(
      sourceUrl,
      promise
    );

    return promise;
  };


  let checked =
    0;

  let fresh =
    0;

  let drifted =
    0;

  let unavailable =
    0;

  let unchanged =
    0;


  for (
    const fact of
    facts
  ) {
    checked++;

    const checkedAt =
      new Date();

    const evidence =
      fact.evidence?.trim() ??
      "";

    const evidenceHash =
      hashEvidenceText(
        evidence
      );


    if (
      !fact.sourceUrl ||
      !evidence
    ) {
      unavailable++;

      const changed =
        await persistEvidenceState({
          fact,
          nextStatus:
            "UNAVAILABLE",
          evidenceHash,
          checkedAt,
          error:
            "Verified fact is missing sourceUrl or evidence.",
        });

      if (!changed) {
        unchanged++;
      }

      continue;
    }


    const source =
      await fetchSource(
        fact.sourceUrl
      );


    if (
      source.error ||
      !source.page ||
      !source.page.parsed
    ) {
      unavailable++;

      const error =
        source.error ??
        "Source did not return parseable HTML.";

      const changed =
        await persistEvidenceState({
          fact,
          nextStatus:
            "UNAVAILABLE",
          evidenceHash,
          checkedAt,
          error,
          page:
            source.page ??
            undefined,
        });

      if (!changed) {
        unchanged++;
      }

      continue;
    }


    const bodyText =
      source.page.parsed
        .bodyText;

    const sourceContentHash =
      hashSourceContent(
        bodyText
      );

    const present =
      sourceContainsEvidence({
        bodyText,
        evidence,
      });


    if (present) {
      fresh++;

      const changed =
        await persistEvidenceState({
          fact,
          nextStatus:
            "FRESH",
          evidenceHash,
          sourceContentHash,
          checkedAt,
          page:
            source.page,
        });

      if (!changed) {
        unchanged++;
      }
    } else {
      drifted++;

      const changed =
        await persistEvidenceState({
          fact,
          nextStatus:
            "DRIFTED",
          evidenceHash,
          sourceContentHash,
          checkedAt,
          page:
            source.page,
        });

      if (!changed) {
        unchanged++;
      }
    }
  }


  return {
    total:
      facts.length,

    checked,

    fresh,

    drifted,

    unavailable,

    unchanged,

    sourceFetches:
      sourceCache.size,
  };
}
