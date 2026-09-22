import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";


const mocks =
  vi.hoisted(
    () => ({
      isSafeUrl:
        vi.fn(),

      isSameDomain:
        vi.fn(),

      normalizeUrl:
        vi.fn(),

      parsePage:
        vi.fn(),
    })
  );


vi.mock(
  "./security",
  () => ({
    isSafeUrl:
      mocks.isSafeUrl,

    isSameDomain:
      mocks.isSameDomain,

    normalizeUrl:
      mocks.normalizeUrl,
  })
);


vi.mock(
  "./parser",
  () => ({
    parsePage:
      mocks.parsePage,
  })
);


import {
  fetchSinglePage,
} from "./crawler";


function normalizer(
  value: string,
  base?: string
): string | null {
  try {
    return new URL(
      value,
      base
    ).toString();
  } catch {
    return null;
  }
}


afterEach(
  () => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  }
);


describe(
  "crawler redirect security",
  () => {
    it(
      "does not fetch an unsafe redirect target",
      async () => {
        mocks.normalizeUrl
          .mockImplementation(
            normalizer
          );

        mocks.isSameDomain
          .mockReturnValue(
            true
          );

        mocks.isSafeUrl
          .mockImplementation(
            async (
              value: string
            ) =>
              value.includes(
                "169.254.169.254"
              )
                ? {
                    safe:
                      false,

                    reason:
                      "Private IP range",
                  }
                : {
                    safe:
                      true,
                  }
          );

        const fetchMock =
          vi.fn()
            .mockResolvedValueOnce(
              new Response(
                null,
                {
                  status:
                    302,

                  headers: {
                    location:
                      "http://169.254.169.254/latest/meta-data",
                  },
                }
              )
            );

        vi.stubGlobal(
          "fetch",
          fetchMock
        );

        const result =
          await fetchSinglePage(
            "https://example.com/"
          );

        expect(
          fetchMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          result.error
        ).toContain(
          "Redirect to unsafe URL"
        );
      }
    );


    it(
      "does not fetch a cross-domain redirect target",
      async () => {
        mocks.normalizeUrl
          .mockImplementation(
            normalizer
          );

        mocks.isSafeUrl
          .mockResolvedValue({
            safe:
              true,
          });

        mocks.isSameDomain
          .mockImplementation(
            (
              base: string,
              target: string
            ) =>
              new URL(
                base
              ).hostname ===
              new URL(
                target
              ).hostname
          );

        const fetchMock =
          vi.fn()
            .mockResolvedValueOnce(
              new Response(
                null,
                {
                  status:
                    302,

                  headers: {
                    location:
                      "https://evil.example/",
                  },
                }
              )
            );

        vi.stubGlobal(
          "fetch",
          fetchMock
        );

        const result =
          await fetchSinglePage(
            "https://example.com/"
          );

        expect(
          fetchMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          result.error
        ).toBe(
          "Redirect left domain"
        );
      }
    );


    it(
      "follows a validated same-domain redirect",
      async () => {
        mocks.normalizeUrl
          .mockImplementation(
            normalizer
          );

        mocks.isSafeUrl
          .mockResolvedValue({
            safe:
              true,
          });

        mocks.isSameDomain
          .mockReturnValue(
            true
          );

        mocks.parsePage
          .mockReturnValue({
            title:
              "Page",

            metaDescription:
              null,

            h1:
              "Page",

            h2s:
              [],

            h3s:
              [],

            canonical:
              null,

            robots:
              null,

            wordCount:
              1,

            bodyText:
              "Page",

            internalLinks:
              [],

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
          });

        const fetchMock =
          vi.fn()
            .mockResolvedValueOnce(
              new Response(
                null,
                {
                  status:
                    307,

                  headers: {
                    location:
                      "https://www.example.com/",
                  },
                }
              )
            )
            .mockResolvedValueOnce(
              new Response(
                "<html><body>Page</body></html>",
                {
                  status:
                    200,

                  headers: {
                    "content-type":
                      "text/html",
                  },
                }
              )
            );

        vi.stubGlobal(
          "fetch",
          fetchMock
        );

        const result =
          await fetchSinglePage(
            "https://example.com/"
          );

        expect(
          fetchMock
        ).toHaveBeenCalledTimes(
          2
        );

        expect(
          result.statusCode
        ).toBe(
          200
        );

        expect(
          result.redirectedFrom
        ).toBe(
          "https://example.com/"
        );

        expect(
          result.url
        ).toBe(
          "https://www.example.com/"
        );
      }
    );
  }
);
