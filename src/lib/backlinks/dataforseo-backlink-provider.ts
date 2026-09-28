import {
  backlinkIdentityKey,
  normalizeBacklinkUrl,
} from "./backlink-state";


const DATAFORSEO_BACKLINK_ENDPOINT =
  "https://api.dataforseo.com/v3/backlinks/backlinks/live";

const PAGE_LIMIT =
  1000;

const DEFAULT_MAX_PAGES =
  3;

const MAX_MAX_PAGES =
  20;


export class DataForSEOBacklinkError
  extends Error {
  constructor(
    message:
      string
  ) {
    super(message);

    this.name =
      "DataForSEOBacklinkError";
  }
}


export interface DataForSEOBacklinkObservation {
  sourceUrl:
    string;

  targetUrl:
    string;

  sourceDomain:
    string;

  anchorText:
    string | null;

  nofollow:
    boolean | null;

  sponsored:
    boolean | null;

  ugc:
    boolean | null;

  providerFirstSeenAt:
    Date | null;

  providerLastSeenAt:
    Date | null;

  providerRef:
    string | null;

  providerData:
    Readonly<
      Record<
        string,
        string |
        number |
        boolean |
        null
      >
    >;
}


export interface DataForSEOBacklinkScan {
  links:
    readonly Readonly<DataForSEOBacklinkObservation>[];

  totalCount:
    number | null;

  itemsFetched:
    number;

  pagesFetched:
    number;

  complete:
    boolean;

  apiCostUsd:
    number;
}


interface Credentials {
  login:
    string;

  password:
    string;
}


type FetchLike =
  typeof fetch;


function asObject(
  value:
    unknown
):
  Record<string, unknown> {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(value)
  ) {
    return value as
      Record<string, unknown>;
  }


  throw new DataForSEOBacklinkError(
    "DATAFORSEO_BACKLINK_OBJECT_REQUIRED"
  );
}


function optionalString(
  value:
    unknown
):
  string | null {
  return typeof value ===
      "string" &&
    value.trim()
    ? value.trim()
    : null;
}


function optionalNumber(
  value:
    unknown
):
  number | null {
  return typeof value ===
      "number" &&
    Number.isFinite(value)
    ? value
    : null;
}


function optionalBoolean(
  value:
    unknown
):
  boolean | null {
  return typeof value ===
    "boolean"
    ? value
    : null;
}


function attributes(
  value:
    unknown
):
  readonly string[] | null {
  if (
    !Array.isArray(value)
  ) {
    return null;
  }


  return Object.freeze(
    value
      .filter(
        (
          item
        ): item is string =>
          typeof item ===
          "string"
      )
      .map(
        (
          item
        ) =>
          item
            .trim()
            .toLowerCase()
      )
  );
}


function providerDate(
  value:
    unknown
):
  Date | null {
  const raw =
    optionalString(value);


  if (
    !raw
  ) {
    return null;
  }


  const normalized =
    raw.replace(
      /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2}) \+00:00$/,
      "$1T$2+00:00"
    );


  const parsed =
    new Date(normalized);


  return Number.isNaN(
    parsed.getTime()
  )
    ? null
    : parsed;
}


function credentialsFromEnv():
  Credentials {
  const login =
    process.env
      .DATAFORSEO_LOGIN
      ?.trim();

  const password =
    process.env
      .DATAFORSEO_PASSWORD
      ?.trim();


  if (
    !login ||
    !password
  ) {
    throw new DataForSEOBacklinkError(
      "DATAFORSEO_BACKLINK_CREDENTIALS_MISSING"
    );
  }


  return {
    login,
    password,
  };
}


function parseBacklink({
  raw,
  taskId,
}: {
  raw:
    unknown;

  taskId:
    string | null;
}):
  Readonly<DataForSEOBacklinkObservation> {
  const row =
    asObject(raw);


  const rawSourceUrl =
    optionalString(
      row.url_from
    );

  const rawTargetUrl =
    optionalString(
      row.url_to
    );


  if (
    !rawSourceUrl ||
    !rawTargetUrl
  ) {
    throw new DataForSEOBacklinkError(
      "DATAFORSEO_BACKLINK_URL_MISSING"
    );
  }


  const sourceUrl =
    normalizeBacklinkUrl(
      rawSourceUrl
    );

  const targetUrl =
    normalizeBacklinkUrl(
      rawTargetUrl
    );


  let sourceDomain =
    optionalString(
      row.domain_from
    );


  if (
    !sourceDomain
  ) {
    sourceDomain =
      new URL(
        sourceUrl
      ).hostname;
  }


  sourceDomain =
    sourceDomain
      .toLowerCase()
      .replace(
        /^www\./,
        ""
      );


  const attrs =
    attributes(
      row.attributes
    );


  const dofollow =
    optionalBoolean(
      row.dofollow
    );


  const nofollow =
    dofollow !==
      null
      ? !dofollow
      : attrs !==
          null
        ? attrs.includes(
            "nofollow"
          )
        : null;


  return Object.freeze({
    sourceUrl,

    targetUrl,

    sourceDomain,

    anchorText:
      optionalString(
        row.anchor
      ),

    nofollow,

    sponsored:
      attrs ===
        null
        ? null
        : attrs.includes(
            "sponsored"
          ),

    ugc:
      attrs ===
        null
        ? null
        : attrs.includes(
            "ugc"
          ),

    providerFirstSeenAt:
      providerDate(
        row.first_seen
      ),

    providerLastSeenAt:
      providerDate(
        row.last_seen
      ),

    providerRef:
      taskId,

    /*
     * Provider metrics stay raw evidence.
     * Growth OS does NOT rename them into DA/PA
     * or create an authority probability.
     */
    providerData:
      Object.freeze({
        rank:
          optionalNumber(
            row.rank
          ),

        domainFromRank:
          optionalNumber(
            row.domain_from_rank
          ),

        pageFromRank:
          optionalNumber(
            row.page_from_rank
          ),

        backlinkSpamScore:
          optionalNumber(
            row.backlink_spam_score
          ),

        pageFromStatusCode:
          optionalNumber(
            row.page_from_status_code
          ),

        itemType:
          optionalString(
            row.item_type
          ),

        semanticLocation:
          optionalString(
            row.semantic_location
          ),

        isNew:
          optionalBoolean(
            row.is_new
          ),

        isLost:
          optionalBoolean(
            row.is_lost
          ),

        isBroken:
          optionalBoolean(
            row.is_broken
          ),

        original:
          optionalBoolean(
            row.original
          ),

        linksCount:
          optionalNumber(
            row.links_count
          ),

        groupCount:
          optionalNumber(
            row.group_count
          ),
      }),
  });
}


export function parseDataForSEOBacklinkPage(
  payload:
    unknown
) {
  const root =
    asObject(payload);


  if (
    root.status_code !==
    20000
  ) {
    throw new DataForSEOBacklinkError(
      `DATAFORSEO_BACKLINK_API_ERROR:${String(
        root.status_message ??
        root.status_code ??
        "UNKNOWN"
      )}`
    );
  }


  if (
    !Array.isArray(
      root.tasks
    ) ||
    root.tasks.length ===
      0
  ) {
    throw new DataForSEOBacklinkError(
      "DATAFORSEO_BACKLINK_TASK_MISSING"
    );
  }


  const task =
    asObject(
      root.tasks[0]
    );


  if (
    task.status_code !==
    20000
  ) {
    throw new DataForSEOBacklinkError(
      `DATAFORSEO_BACKLINK_TASK_ERROR:${String(
        task.status_message ??
        task.status_code ??
        "UNKNOWN"
      )}`
    );
  }


  if (
    !Array.isArray(
      task.result
    ) ||
    task.result.length ===
      0
  ) {
    throw new DataForSEOBacklinkError(
      "DATAFORSEO_BACKLINK_RESULT_MISSING"
    );
  }


  const result =
    asObject(
      task.result[0]
    );


  const rawItems =
    Array.isArray(
      result.items
    )
      ? result.items
      : [];


  const taskId =
    optionalString(
      task.id
    );


  return Object.freeze({
    totalCount:
      optionalNumber(
        result.total_count
      ),

    searchAfterToken:
      optionalString(
        result.search_after_token
      ),

    links:
      Object.freeze(
        rawItems.map(
          (
            item
          ) =>
            parseBacklink({
              raw:
                item,

              taskId,
            })
        )
      ),

    costUsd:
      optionalNumber(
        task.cost
      ) ??
      0,
  });
}


export async function fetchDataForSEOBacklinks({
  targetUrl,
  maxPages =
    DEFAULT_MAX_PAGES,
  fetchImpl =
    fetch,
  credentials,
}: {
  targetUrl:
    string;

  maxPages?:
    number;

  fetchImpl?:
    FetchLike;

  credentials?:
    Credentials;
}):
  Promise<
    Readonly<DataForSEOBacklinkScan>
  > {
  const target =
    normalizeBacklinkUrl(
      targetUrl
    );


  if (
    !Number.isInteger(
      maxPages
    ) ||
    maxPages <
      1 ||
    maxPages >
      MAX_MAX_PAGES
  ) {
    throw new DataForSEOBacklinkError(
      "DATAFORSEO_BACKLINK_MAX_PAGES_INVALID"
    );
  }


  const auth =
    credentials ??
    credentialsFromEnv();


  const encodedAuth =
    Buffer
      .from(
        `${auth.login}:${auth.password}`
      )
      .toString(
        "base64"
      );


  const collected =
    new Map<
      string,
      Readonly<DataForSEOBacklinkObservation>
    >();


  let searchAfterToken:
    string | null =
      null;

  let totalCount:
    number | null =
      null;

  let pagesFetched =
    0;

  let apiCostUsd =
    0;

  let exhausted =
    false;


  for (
    let page =
      0;
    page <
    maxPages;
    page +=
      1
  ) {
    const task:
      Record<string, unknown> = {
        target,

        mode:
          "as_is",

        backlinks_status_type:
          "live",

        exclude_internal_backlinks:
          true,

        limit:
          PAGE_LIMIT,
      };


    if (
      searchAfterToken
    ) {
      task.search_after_token =
        searchAfterToken;
    }


    const response =
      await fetchImpl(
        DATAFORSEO_BACKLINK_ENDPOINT,
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Basic ${encodedAuth}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify([
              task,
            ]),
        }
      );


    if (
      !response.ok
    ) {
      const responseText =
        await response
          .text()
          .catch(
            () =>
              ""
          );


      throw new DataForSEOBacklinkError(
        `DATAFORSEO_BACKLINK_HTTP_ERROR:${response.status}:${responseText.slice(0, 300)}`
      );
    }


    const parsed =
      parseDataForSEOBacklinkPage(
        await response.json()
      );


    pagesFetched +=
      1;

    apiCostUsd +=
      parsed.costUsd;


    if (
      parsed.totalCount !==
      null
    ) {
      totalCount =
        parsed.totalCount;
    }


    for (
      const backlink
      of parsed.links
    ) {
      const key =
        backlinkIdentityKey({
          sourceUrl:
            backlink.sourceUrl,

          targetUrl:
            backlink.targetUrl,
        });


      if (
        !collected.has(
          key
        )
      ) {
        collected.set(
          key,
          backlink
        );
      }
    }


    const nextToken =
      parsed
        .searchAfterToken;


    if (
      totalCount !==
        null &&
      collected.size >=
        totalCount
    ) {
      exhausted =
        true;

      searchAfterToken =
        null;

      break;
    }


    if (
      !nextToken
    ) {
      exhausted =
        true;

      searchAfterToken =
        null;

      break;
    }


    if (
      nextToken ===
      searchAfterToken
    ) {
      throw new DataForSEOBacklinkError(
        "DATAFORSEO_BACKLINK_PAGINATION_TOKEN_REPEATED"
      );
    }


    searchAfterToken =
      nextToken;
  }


  return Object.freeze({
    links:
      Object.freeze(
        [
          ...collected.values(),
        ].sort(
          (
            a,
            b
          ) =>
            backlinkIdentityKey({
              sourceUrl:
                a.sourceUrl,

              targetUrl:
                a.targetUrl,
            }).localeCompare(
              backlinkIdentityKey({
                sourceUrl:
                  b.sourceUrl,

                targetUrl:
                  b.targetUrl,
              })
            )
        )
      ),

    totalCount,

    itemsFetched:
      collected.size,

    pagesFetched,

    complete:
      exhausted,

    apiCostUsd,
  });
}
