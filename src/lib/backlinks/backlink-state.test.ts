import {
  describe,
  expect,
  it,
} from "vitest";

import {
  backlinkIdentityKey,
  deriveBacklinkStateV1,
  normalizeBacklinkUrl,
} from "./backlink-state";


const target =
  "https://example.com/article";


function link(
  sourceUrl:
    string
) {
  return {
    sourceUrl,

    targetUrl:
      target,
  };
}


describe(
  "backlink state v1",
  () => {
    it(
      "treats the first successful discovery as baseline rather than pretending the links are new",
      () => {
        const result =
          deriveBacklinkStateV1({
            previous:
              null,

            current: {
              executionStatus:
                "SUCCEEDED",

              links: [
                link(
                  "https://publisher.com/reference"
                ),
              ],
            },
          });

        expect(
          result.counts.baseline
        ).toBe(1);

        expect(
          result.counts.new
        ).toBe(0);

        expect(
          result.links[0]
            ?.state
        ).toBe(
          "BASELINE"
        );
      }
    );


    it(
      "detects a newly acquired backlink only after a prior successful snapshot",
      () => {
        const result =
          deriveBacklinkStateV1({
            previous: {
              executionStatus:
                "SUCCEEDED",

              links:
                [],
            },

            current: {
              executionStatus:
                "SUCCEEDED",

              links: [
                link(
                  "https://publisher.com/new-reference"
                ),
              ],
            },
          });

        expect(
          result.counts.new
        ).toBe(1);

        expect(
          result.links[0]
            ?.state
        ).toBe(
          "NEW"
        );
      }
    );


    it(
      "keeps a backlink active when the source-target pair remains present",
      () => {
        const existing =
          link(
            "https://publisher.com/reference"
          );

        const result =
          deriveBacklinkStateV1({
            previous: {
              executionStatus:
                "SUCCEEDED",

              links: [
                existing,
              ],
            },

            current: {
              executionStatus:
                "SUCCEEDED",

              links: [
                existing,
              ],
            },
          });

        expect(
          result.counts.active
        ).toBe(1);
      }
    );


    it(
      "detects lost backlinks only from two successful snapshots",
      () => {
        const result =
          deriveBacklinkStateV1({
            previous: {
              executionStatus:
                "SUCCEEDED",

              links: [
                link(
                  "https://publisher.com/reference"
                ),
              ],
            },

            current: {
              executionStatus:
                "SUCCEEDED",

              links:
                [],
            },
          });

        expect(
          result.counts.lost
        ).toBe(1);

        expect(
          result.links[0]
            ?.state
        ).toBe(
          "LOST"
        );
      }
    );


    it(
      "detects restored backlinks from historical identity evidence",
      () => {
        const restored =
          link(
            "https://publisher.com/reference"
          );

        const historicalKey =
          backlinkIdentityKey(
            restored
          );

        const result =
          deriveBacklinkStateV1({
            previous: {
              executionStatus:
                "SUCCEEDED",

              links:
                [],
            },

            current: {
              executionStatus:
                "SUCCEEDED",

              links: [
                restored,
              ],
            },

            historicallySeenKeys: [
              historicalKey,
            ],
          });

        expect(
          result.counts.restored
        ).toBe(1);

        expect(
          result.links[0]
            ?.state
        ).toBe(
          "RESTORED"
        );
      }
    );


    it(
      "never infers lost links from a failed current snapshot",
      () => {
        expect(
          () =>
            deriveBacklinkStateV1({
              previous: {
                executionStatus:
                  "SUCCEEDED",

                links: [
                  link(
                    "https://publisher.com/reference"
                  ),
                ],
              },

              current: {
                executionStatus:
                  "FAILED",

                links:
                  [],
              },
            })
        ).toThrow(
          "BACKLINK_CURRENT_SNAPSHOT_NOT_SUCCESSFUL"
        );
      }
    );


    it(
      "never compares against a failed previous snapshot",
      () => {
        expect(
          () =>
            deriveBacklinkStateV1({
              previous: {
                executionStatus:
                  "FAILED",

                links:
                  [],
              },

              current: {
                executionStatus:
                  "SUCCEEDED",

                links:
                  [],
              },
            })
        ).toThrow(
          "BACKLINK_PREVIOUS_SNAPSHOT_NOT_SUCCESSFUL"
        );
      }
    );


    it(
      "normalizes safe URL identity without inventing links",
      () => {
        expect(
          normalizeBacklinkUrl(
            "HTTPS://Publisher.COM/reference/#section"
          )
        ).toBe(
          "https://publisher.com/reference"
        );
      }
    );


    it(
      "rejects duplicate source-target pairs inside one snapshot",
      () => {
        const duplicate =
          link(
            "https://publisher.com/reference"
          );

        expect(
          () =>
            deriveBacklinkStateV1({
              previous:
                null,

              current: {
                executionStatus:
                  "SUCCEEDED",

                links: [
                  duplicate,
                  duplicate,
                ],
              },
            })
        ).toThrow(
          "BACKLINK_DUPLICATE_LINK"
        );
      }
    );


    it(
      "exposes anti-fabrication provenance",
      () => {
        const result =
          deriveBacklinkStateV1({
            previous:
              null,

            current: {
              executionStatus:
                "SUCCEEDED",

              links:
                [],
            },
          });

        expect(
          result.provenance
            .noAuthorityScore
        ).toBe(true);

        expect(
          result.provenance
            .noCausalInference
        ).toBe(true);

        expect(
          result.provenance
            .noSyntheticLinks
        ).toBe(true);
      }
    );
  }
);

describe(
  "partial backlink scan safety",
  () => {
    it(
      "never derives LOST from a partial current snapshot",
      () => {
        expect(
          () =>
            deriveBacklinkStateV1({
              previous: {
                executionStatus:
                  "SUCCEEDED",

                links: [
                  {
                    sourceUrl:
                      "https://publisher.com/reference",

                    targetUrl:
                      "https://example.com/article",
                  },
                ],
              },

              current: {
                executionStatus:
                  "PARTIAL",

                links:
                  [],
              },
            })
        ).toThrow(
          "BACKLINK_CURRENT_SNAPSHOT_NOT_SUCCESSFUL"
        );
      }
    );


    it(
      "never treats a partial previous snapshot as lifecycle evidence",
      () => {
        expect(
          () =>
            deriveBacklinkStateV1({
              previous: {
                executionStatus:
                  "PARTIAL",

                links:
                  [],
              },

              current: {
                executionStatus:
                  "SUCCEEDED",

                links:
                  [],
              },
            })
        ).toThrow(
          "BACKLINK_PREVIOUS_SNAPSHOT_NOT_SUCCESSFUL"
        );
      }
    );
  }
);
