import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "server-only",
  () => ({})
);

import {
  buildDiscoverySeeds,
  scoreKeywordFit,
  selectKeywordCandidates,
  classifyLiveRank,
  classifyPriority,
  isDomainMatch,
  normalizeSiteDomain,
} from "./live-rank-service";

describe(
  "live rank helpers",
  () => {
    it(
      "does not spend SERP checks on ambiguous keywords",
      () => {
        const seeds =
          buildDiscoverySeeds(
            "credit monitoring and identity protection"
          );

        const selected =
          selectKeywordCandidates(
            [
              {
                keyword:
                  "identity protection pin",
                searchVolume:
                  27100,
                keywordDifficulty:
                  11,
              },
              {
                keyword:
                  "credit monitoring",
                searchVolume:
                  8100,
                keywordDifficulty:
                  58,
              },
              {
                keyword:
                  "experian credit monitoring",
                searchVolume:
                  5400,
                keywordDifficulty:
                  41,
              },
              {
                keyword:
                  "best identity theft protection",
                searchVolume:
                  5400,
                keywordDifficulty:
                  41,
              },
              {
                keyword:
                  "free credit monitoring",
                searchVolume:
                  135000,
                keywordDifficulty:
                  61,
              },
              {
                keyword:
                  "credit monitoring and identity protection",
                searchVolume:
                  10,
                keywordDifficulty:
                  null,
              },
            ],
            seeds,
            6
          );

        expect(
          selected.map(
            (
              item
            ) =>
              item.keyword
          )
        ).toEqual(
          [
            "credit monitoring",
            "credit monitoring and identity protection",
            "free credit monitoring",
            "best identity theft protection",
          ]
        );

        expect(
          selected.some(
            (
              item
            ) =>
              item.keyword ===
              "identity protection pin"
          )
        ).toBe(
          false
        );

        expect(
          selected.some(
            (
              item
            ) =>
              item.keyword ===
              "experian credit monitoring"
          )
        ).toBe(
          false
        );
      }
    );

    it(
      "filters misleading related keywords before SEO decisions",
      () => {
        const seeds =
          buildDiscoverySeeds(
            "credit monitoring and identity protection"
          );

        expect(
          scoreKeywordFit(
            "credit monitoring",
            seeds
          ).fit
        ).toBe(
          "CORE"
        );

        expect(
          scoreKeywordFit(
            "free credit monitoring",
            seeds
          ).fit
        ).toBe(
          "RELEVANT"
        );

        expect(
          scoreKeywordFit(
            "best identity theft protection",
            seeds
          ).fit
        ).toBe(
          "RELEVANT"
        );

        expect(
          scoreKeywordFit(
            "experian credit monitoring",
            seeds
          ).fit
        ).toBe(
          "AMBIGUOUS"
        );

        expect(
          scoreKeywordFit(
            "identity protection pin",
            seeds
          ).fit
        ).toBe(
          "AMBIGUOUS"
        );
      }
    );

    it(
      "splits a broad business topic into useful search seeds",
      () => {
        expect(
          buildDiscoverySeeds(
            "credit monitoring and identity protection"
          )
        ).toEqual(
          [
            "credit monitoring and identity protection",
            "credit monitoring",
            "identity protection",
          ]
        );
      }
    );

    it(
      "normalizes website domains",
      () => {
        expect(
          normalizeSiteDomain(
            "https://www.ScanMyCreds.com/pricing"
          )
        ).toBe(
          "scanmycreds.com"
        );
      }
    );

    it(
      "matches www and subdomains safely",
      () => {
        expect(
          isDomainMatch(
            "www.scanmycreds.com",
            "scanmycreds.com"
          )
        ).toBe(
          true
        );

        expect(
          isDomainMatch(
            "blog.scanmycreds.com",
            "scanmycreds.com"
          )
        ).toBe(
          true
        );

        expect(
          isDomainMatch(
            "notscanmycreds.com",
            "scanmycreds.com"
          )
        ).toBe(
          false
        );
      }
    );

    it(
      "classifies ranking zones",
      () => {
        expect(
          classifyLiveRank(
            2
          )
        ).toBe(
          "TOP_3"
        );

        expect(
          classifyLiveRank(
            8
          )
        ).toBe(
          "FIRST_PAGE"
        );

        expect(
          classifyLiveRank(
            14
          )
        ).toBe(
          "NEAR_FIRST_PAGE"
        );

        expect(
          classifyLiveRank(
            null
          )
        ).toBe(
          "NOT_TOP_100"
        );
      }
    );

    it(
      "marks realistic positions 4 through 20 as high priority",
      () => {
        expect(
          classifyPriority(
            14,
            1000,
            45
          )
        ).toBe(
          "HIGH"
        );
      }
    );
  }
);
