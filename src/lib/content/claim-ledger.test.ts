import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildEvidenceGraph,
} from "./evidence-graph";

import {
  buildClaimLedger,
} from "./claim-ledger";


const asOf =
  new Date(
    "2026-09-21T00:00:00.000Z"
  );


function source({
  id,
  type =
    "PRIMARY_GOVERNMENT",
  jurisdiction =
    "US",
  publishedAt =
    "2026-09-15T00:00:00.000Z",
}: {
  id:
    string;

  type?:
    | "PRIMARY_GOVERNMENT"
    | "PRIMARY_OFFICIAL"
    | "ACADEMIC"
    | "REPUTABLE_SECONDARY"
    | "COMPETITOR"
    | "UGC";

  jurisdiction?:
    string;

  publishedAt?:
    string;
}) {
  return {
    id,

    url:
      `https://${id}.example.com/source`,

    publisher:
      id,

    sourceType:
      type,

    authorityTier:
      (
        type ===
        "PRIMARY_GOVERNMENT"
          ? "A"
          : type ===
            "PRIMARY_OFFICIAL"
            ? "B"
            : type ===
              "ACADEMIC" ||
              type ===
                "REPUTABLE_SECONDARY"
              ? "C"
              : type ===
                "COMPETITOR"
                ? "E"
                : "F"
      ) as
        | "A"
        | "B"
        | "C"
        | "E"
        | "F",

    jurisdiction,

    publishedAt:
      new Date(
        publishedAt
      ),

    retrievedAt:
      asOf,
  };
}


describe(
  "Claim Ledger V1",
  () => {
    it(
      "verifies a claim from publication-grade evidence",
      () => {
        const graph =
          buildEvidenceGraph({
            sources: [
              source({
                id:
                  "cfpb",
              }),
            ],

            claimEvidence: [
              {
                id:
                  "ev-1",

                claimId:
                  "claim-1",

                sourceId:
                  "cfpb",

                relation:
                  "SUPPORTS",

                kind:
                  "VERIFIED_EXCERPT",

                excerpt:
                  "Monitoring can alert consumers to changes in a credit report.",
              },
            ],
          });

        const ledger =
          buildClaimLedger({
            graph,

            asOf,

            claims: [
              {
                id:
                  "claim-1",

                text:
                  "Credit monitoring can alert consumers to changes in a credit report.",

                category:
                  "FINANCIAL",

                risk:
                  "HIGH",

                jurisdiction:
                  "US",
              },
            ],
          });

        expect(
          ledger.claims[0]
            ?.status
        ).toBe(
          "VERIFIED"
        );

        expect(
          ledger.claims[0]
            ?.evidenceIds
        ).toEqual([
          "ev-1",
        ]);
      }
    );


    it(
      "does not authorize a sensitive claim from a search snippet",
      () => {
        const graph =
          buildEvidenceGraph({
            sources: [
              source({
                id:
                  "search-result",
              }),
            ],

            claimEvidence: [
              {
                id:
                  "ev-1",

                claimId:
                  "claim-1",

                sourceId:
                  "search-result",

                relation:
                  "SUPPORTS",

                kind:
                  "SEARCH_SNIPPET",

                excerpt:
                  "Search result snippet.",
              },
            ],
          });

        const ledger =
          buildClaimLedger({
            graph,

            asOf,

            claims: [
              {
                id:
                  "claim-1",

                text:
                  "A sensitive financial claim.",

                category:
                  "FINANCIAL",

                risk:
                  "HIGH",

                jurisdiction:
                  "US",
              },
            ],
          });

        expect(
          ledger.claims[0]
            ?.status
        ).toBe(
          "UNSUPPORTED"
        );

        expect(
          ledger.claims[0]
            ?.evidenceIds
        ).toEqual([]);
      }
    );


    it(
      "marks verified contradictory evidence as CONTRADICTED",
      () => {
        const graph =
          buildEvidenceGraph({
            sources: [
              source({
                id:
                  "cfpb",
              }),
            ],

            claimEvidence: [
              {
                id:
                  "ev-1",

                claimId:
                  "claim-1",

                sourceId:
                  "cfpb",

                relation:
                  "CONTRADICTS",

                kind:
                  "VERIFIED_EXCERPT",

                excerpt:
                  "The source contradicts the proposed claim.",
              },
            ],
          });

        const ledger =
          buildClaimLedger({
            graph,

            asOf,

            claims: [
              {
                id:
                  "claim-1",

                text:
                  "Credit monitoring prevents identity theft.",

                category:
                  "FINANCIAL",

                risk:
                  "HIGH",

                jurisdiction:
                  "US",
              },
            ],
          });

        expect(
          ledger.claims[0]
            ?.status
        ).toBe(
          "CONTRADICTED"
        );
      }
    );


    it(
      "detects jurisdiction mismatch",
      () => {
        const graph =
          buildEvidenceGraph({
            sources: [
              source({
                id:
                  "ca-source",

                jurisdiction:
                  "CA",
              }),
            ],

            claimEvidence: [
              {
                id:
                  "ev-1",

                claimId:
                  "claim-1",

                sourceId:
                  "ca-source",

                relation:
                  "SUPPORTS",

                kind:
                  "VERIFIED_EXCERPT",

                excerpt:
                  "Canada-specific regulatory statement.",
              },
            ],
          });

        const ledger =
          buildClaimLedger({
            graph,

            asOf,

            claims: [
              {
                id:
                  "claim-1",

                text:
                  "A US legal requirement.",

                category:
                  "LEGAL",

                risk:
                  "HIGH",

                jurisdiction:
                  "US",
              },
            ],
          });

        expect(
          ledger.claims[0]
            ?.status
        ).toBe(
          "JURISDICTION_MISMATCH"
        );
      }
    );


    it(
      "requires a primary government source for law",
      () => {
        const graph =
          buildEvidenceGraph({
            sources: [
              source({
                id:
                  "company-doc",

                type:
                  "PRIMARY_OFFICIAL",
              }),
            ],

            claimEvidence: [
              {
                id:
                  "ev-1",

                claimId:
                  "law-claim",

                sourceId:
                  "company-doc",

                relation:
                  "SUPPORTS",

                kind:
                  "VERIFIED_EXCERPT",

                excerpt:
                  "Company description of legal requirements.",
              },
            ],
          });

        const ledger =
          buildClaimLedger({
            graph,

            asOf,

            claims: [
              {
                id:
                  "law-claim",

                text:
                  "A legal requirement applies.",

                category:
                  "LEGAL",

                risk:
                  "HIGH",

                jurisdiction:
                  "US",
              },
            ],
          });

        expect(
          ledger.claims[0]
            ?.status
        ).toBe(
          "UNSUPPORTED"
        );
      }
    );


    it(
      "marks legal evidence STALE only when explicit freshness policy proves staleness",
      () => {
        const graph =
          buildEvidenceGraph({
            sources: [
              source({
                id:
                  "old-law",

                publishedAt:
                  "2025-01-01T00:00:00.000Z",
              }),
            ],

            claimEvidence: [
              {
                id:
                  "ev-1",

                claimId:
                  "law-claim",

                sourceId:
                  "old-law",

                relation:
                  "SUPPORTS",

                kind:
                  "VERIFIED_EXCERPT",

                excerpt:
                  "Old legal source.",
              },
            ],
          });

        const ledger =
          buildClaimLedger({
            graph,

            asOf,

            claims: [
              {
                id:
                  "law-claim",

                text:
                  "Current legal requirement.",

                category:
                  "LEGAL",

                risk:
                  "HIGH",

                jurisdiction:
                  "US",
              },
            ],

            freshnessRules: [
              {
                claimId:
                  "law-claim",

                factType:
                  "LAW",

                maxAgeDays:
                  30,
              },
            ],
          });

        expect(
          ledger.claims[0]
            ?.status
        ).toBe(
          "STALE"
        );
      }
    );
  }
);
