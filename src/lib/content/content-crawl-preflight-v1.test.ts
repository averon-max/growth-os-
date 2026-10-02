import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  CrawledPage,
} from "@/lib/crawler/crawler";

import {
  buildContentCrawlPreflightFromPagesV1,
} from "./content-crawl-preflight-v1";


function page({
  url,
  title,
  h1,
  robots = null,
}: {
  url:
    string;

  title:
    string;

  h1:
    string;

  robots?:
    string | null;
}): CrawledPage {
  return {
    url,

    statusCode:
      200,

    contentType:
      "text/html",

    responseTime:
      10,

    depth:
      1,

    parsed: {
      title,

      metaDescription:
        null,

      h1,

      h2s:
        [],

      h3s:
        [],

      canonical:
        url,

      robots,

      wordCount:
        900,

      bodyText:
        "not included in preflight prompt",

      internalLinks: [
        "https://example.com/",
      ],

      externalLinks:
        [],

      imagesCount:
        0,

      imagesWithoutAlt:
        0,

      hasJsonLd:
        false,

      jsonLdTypes:
        [],
    },
  };
}


describe(
  "CONTENT_REAL_CRAWL_PREFLIGHT_V1",
  () => {
    it(
      "detects a strong existing owner from real page metadata",
      () => {
        const result =
          buildContentCrawlPreflightFromPagesV1({
            query:
              "canonical tags",

            pages: [
              page({
                url:
                  "https://example.com/canonical-tags",

                title:
                  "Canonical Tags Guide",

                h1:
                  "Canonical Tags",
              }),
            ],
          });

        expect(
          result.ownershipSignal
        ).toBe(
          "STRONG_OWNER"
        );
      }
    );


    it(
      "detects multiple possible owners",
      () => {
        const result =
          buildContentCrawlPreflightFromPagesV1({
            query:
              "credit monitoring",

            pages: [
              page({
                url:
                  "https://example.com/credit-monitoring",

                title:
                  "Credit Monitoring",

                h1:
                  "Credit Monitoring",
              }),

              page({
                url:
                  "https://example.com/guides/credit-monitoring",

                title:
                  "Credit Monitoring Guide",

                h1:
                  "Credit Monitoring Guide",
              }),
            ],
          });

        expect(
          result.ownershipSignal
        ).toBe(
          "MULTIPLE_POSSIBLE_OWNERS"
        );
      }
    );


    it(
      "does not expose crawled body text to generation context",
      () => {
        const result =
          buildContentCrawlPreflightFromPagesV1({
            query:
              "canonical tags",

            pages: [
              page({
                url:
                  "https://example.com/canonical-tags",

                title:
                  "Canonical Tags",

                h1:
                  "Canonical Tags",
              }),
            ],
          });

        expect(
          result.promptContext
        ).not.toContain(
          "not included in preflight prompt"
        );

        expect(
          result.promptContext.length
        ).toBeLessThanOrEqual(
          4000
        );
      }
    );


    it(
      "ignores noindex pages as authoritative owners",
      () => {
        const result =
          buildContentCrawlPreflightFromPagesV1({
            query:
              "canonical tags",

            pages: [
              page({
                url:
                  "https://example.com/canonical-tags",

                title:
                  "Canonical Tags",

                h1:
                  "Canonical Tags",

                robots:
                  "noindex,follow",
              }),
            ],
          });

        expect(
          result.ownershipSignal
        ).toBe(
          "NONE"
        );
      }
    );
  }
);
