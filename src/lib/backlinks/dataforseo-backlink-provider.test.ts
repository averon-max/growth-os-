import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  DataForSEOBacklinkError,
  fetchDataForSEOBacklinks,
  parseDataForSEOBacklinkPage,
} from "./dataforseo-backlink-provider";


function backlink(
  source:
    string
) {
  return {
    domain_from:
      new URL(
        source
      ).hostname,

    url_from:
      source,

    url_to:
      "https://example.com/article",

    anchor:
      "Useful research",

    dofollow:
      true,

    attributes: [
      "ugc",
    ],

    first_seen:
      "2026-09-01 10:00:00 +00:00",

    last_seen:
      "2026-09-20 11:00:00 +00:00",

    rank:
      50,

    domain_from_rank:
      60,

    page_from_rank:
      40,

    backlink_spam_score:
      2,

    item_type:
      "anchor",

    semantic_location:
      "article",

    is_new:
      false,

    is_lost:
      false,

    is_broken:
      false,

    original:
      true,

    links_count:
      1,

    group_count:
      1,

    page_from_status_code:
      200,
  };
}


function payload({
  items,
  totalCount,
  token =
    null,
}: {
  items:
    unknown[];

  totalCount:
    number;

  token?:
    string | null;
}) {
  return {
    status_code:
      20000,

    status_message:
      "Ok.",

    tasks: [
      {
        id:
          "task-1",

        status_code:
          20000,

        status_message:
          "Ok.",

        cost:
          0.02,

        result: [
          {
            total_count:
              totalCount,

            items,

            search_after_token:
              token,
          },
        ],
      },
    ],
  };
}


describe(
  "DataForSEO backlink provider",
  () => {
    it(
      "parses observed backlink evidence",
      () => {
        const result =
          parseDataForSEOBacklinkPage(
            payload({
              totalCount:
                1,

              items: [
                backlink(
                  "https://publisher.com/research"
                ),
              ],
            })
          );


        expect(
          result.links
        ).toHaveLength(1);


        expect(
          result.links[0]
        ).toMatchObject({
          sourceUrl:
            "https://publisher.com/research",

          targetUrl:
            "https://example.com/article",

          sourceDomain:
            "publisher.com",

          anchorText:
            "Useful research",

          nofollow:
            false,

          sponsored:
            false,

          ugc:
            true,
        });


        expect(
          result.links[0]
            ?.providerFirstSeenAt
            ?.toISOString()
        ).toBe(
          "2026-09-01T10:00:00.000Z"
        );
      }
    );


    it(
      "uses search_after_token for pagination",
      async () => {
        const fetchMock =
          vi.fn();


        fetchMock
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify(
                payload({
                  totalCount:
                    2,

                  token:
                    "page-2",

                  items: [
                    backlink(
                      "https://a.com/a"
                    ),
                  ],
                })
              ),
              {
                status:
                  200,
              }
            )
          )
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify(
                payload({
                  totalCount:
                    2,

                  items: [
                    backlink(
                      "https://b.com/b"
                    ),
                  ],
                })
              ),
              {
                status:
                  200,
              }
            )
          );


        const result =
          await fetchDataForSEOBacklinks({
            targetUrl:
              "https://example.com/article",

            maxPages:
              3,

            fetchImpl:
              fetchMock as
                typeof fetch,

            credentials: {
              login:
                "test",

              password:
                "test",
            },
          });


        expect(
          result.complete
        ).toBe(true);

        expect(
          result.itemsFetched
        ).toBe(2);

        expect(
          result.pagesFetched
        ).toBe(2);


        const first =
          JSON.parse(
            String(
              fetchMock
                .mock
                .calls[0]
                ?.[1]
                ?.body
            )
          );


        expect(
          first[0]
        ).toMatchObject({
          target:
            "https://example.com/article",

          mode:
            "as_is",

          backlinks_status_type:
            "live",

          exclude_internal_backlinks:
            true,

          limit:
            1000,
        });


        const second =
          JSON.parse(
            String(
              fetchMock
                .mock
                .calls[1]
                ?.[1]
                ?.body
            )
          );


        expect(
          second[0]
            .search_after_token
        ).toBe(
          "page-2"
        );
      }
    );


    it(
      "returns partial when page cap is reached before pagination is exhausted",
      async () => {
        const fetchMock =
          vi.fn()
            .mockResolvedValue(
              new Response(
                JSON.stringify(
                  payload({
                    totalCount:
                      5000,

                    token:
                      "more-data",

                    items: [
                      backlink(
                        "https://a.com/a"
                      ),
                    ],
                  })
                ),
                {
                  status:
                    200,
                }
              )
            );


        const result =
          await fetchDataForSEOBacklinks({
            targetUrl:
              "https://example.com/article",

            maxPages:
              1,

            fetchImpl:
              fetchMock as
                typeof fetch,

            credentials: {
              login:
                "test",

              password:
                "test",
            },
          });


        expect(
          result.complete
        ).toBe(false);

        expect(
          result.pagesFetched
        ).toBe(1);
      }
    );


    it(
      "rejects provider failure",
      () => {
        expect(
          () =>
            parseDataForSEOBacklinkPage({
              status_code:
                50000,

              status_message:
                "Provider failure",
            })
        ).toThrow(
          DataForSEOBacklinkError
        );
      }
    );
  }
);
