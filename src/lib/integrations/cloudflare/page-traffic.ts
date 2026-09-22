const CLOUDFLARE_GRAPHQL_ENDPOINT =
  "https://api.cloudflare.com/client/v4/graphql";

interface FetchPageTrafficParams {
  zoneId: string;
  apiToken: string;
  since: string;
  until: string;
}

interface PageTrafficGroup {
  count: number;

  dimensions: {
    clientRequestPath: string;
    verifiedBotCategory: string;
  };

  sum?: {
    visits?: number;
  };
}

interface PageTrafficGraphQLResponse {
  data?: {
    viewer?: {
      zones?: Array<{
        groups?: PageTrafficGroup[];
      }>;
    };
  };

  errors?: Array<{
    message: string;
  }>;
}

export interface PageTrafficBotCategory {
  category: string;
  requests: number;
}

export interface PageTrafficRow {
  date: string;
  path: string;

  totalRequests: number;
  visits: number;

  verifiedBotRequests: number;
  unclassifiedRequests: number;

  botCategoryBreakdown:
    PageTrafficBotCategory[];
}

export interface PageTrafficSkippedDay {
  date: string;
  reason: string;
}

export interface FetchPageTrafficResult {
  rows: PageTrafficRow[];
  skippedDays: PageTrafficSkippedDay[];
}

const PAGE_TRAFFIC_QUERY = `
  query GetPageTraffic(
    $zoneTag: String!
    $day: Date!
  ) {
    viewer {
      zones(
        filter: {
          zoneTag: $zoneTag
        }
      ) {
        groups: httpRequestsAdaptiveGroups(
          limit: 10000
          orderBy: [count_DESC]
          filter: {
            date: $day
            requestSource: "eyeball"
          }
        ) {
          count

          dimensions {
            clientRequestPath
            verifiedBotCategory
          }

          sum {
            visits
          }
        }
      }
    }
  }
`;

function enumerateDates(
  since: string,
  until: string
): string[] {
  const result: string[] = [];

  const current =
    new Date(
      `${since}T00:00:00Z`
    );

  const end =
    new Date(
      `${until}T00:00:00Z`
    );

  while (
    current <= end
  ) {
    result.push(
      current
        .toISOString()
        .slice(0, 10)
    );

    current.setUTCDate(
      current.getUTCDate() + 1
    );
  }

  return result;
}

function normalizePath(
  value: string
): string {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return "";
  }

  if (
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  return `/${trimmed}`;
}

export function aggregatePageTrafficGroups(
  date: string,
  groups: PageTrafficGroup[]
): PageTrafficRow[] {
  const rows =
    new Map<
      string,
      {
        totalRequests: number;
        visits: number;
        verifiedBotRequests: number;
        unclassifiedRequests: number;
        botCategories:
          Map<string, number>;
      }
    >();

  for (
    const group of groups
  ) {
    const path =
      normalizePath(
        group.dimensions
          .clientRequestPath ??
          ""
      );

    if (!path) {
      continue;
    }

    const requests =
      Number(
        group.count
      ) || 0;

    const visits =
      Number(
        group.sum?.visits
      ) || 0;

    const category =
      (
        group.dimensions
          .verifiedBotCategory ??
        ""
      ).trim();

    let row =
      rows.get(path);

    if (!row) {
      row = {
        totalRequests:
          0,

        visits:
          0,

        verifiedBotRequests:
          0,

        unclassifiedRequests:
          0,

        botCategories:
          new Map<
            string,
            number
          >(),
      };

      rows.set(
        path,
        row
      );
    }

    row.totalRequests +=
      requests;

    row.visits +=
      visits;

    if (category) {
      row.verifiedBotRequests +=
        requests;

      row.botCategories.set(
        category,
        (
          row.botCategories.get(
            category
          ) ?? 0
        ) +
          requests
      );
    } else {
      row.unclassifiedRequests +=
        requests;
    }
  }

  return Array.from(
    rows.entries()
  )
    .map(
      ([
        path,
        row,
      ]) => ({
        date,
        path,

        totalRequests:
          row.totalRequests,

        visits:
          row.visits,

        verifiedBotRequests:
          row.verifiedBotRequests,

        unclassifiedRequests:
          row.unclassifiedRequests,

        botCategoryBreakdown:
          Array.from(
            row.botCategories
              .entries()
          )
            .map(
              ([
                category,
                requests,
              ]) => ({
                category,
                requests,
              })
            )
            .sort(
              (
                a,
                b
              ) =>
                b.requests -
                a.requests
            ),
      })
    )
    .sort(
      (
        a,
        b
      ) =>
        b.totalRequests -
        a.totalRequests
    );
}

async function fetchOneDayPageTraffic(
  zoneId: string,
  apiToken: string,
  day: string
): Promise<PageTrafficGroup[]> {
  const response =
    await fetch(
      CLOUDFLARE_GRAPHQL_ENDPOINT,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${apiToken}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            query:
              PAGE_TRAFFIC_QUERY,

            variables: {
              zoneTag:
                zoneId,

              day,
            },
          }),
      }
    );

  const json =
    await response.json() as
      PageTrafficGraphQLResponse;

  if (!response.ok) {
    throw new Error(
      `Cloudflare page traffic HTTP ${response.status}`
    );
  }

  if (
    json.errors?.length
  ) {
    throw new Error(
      json.errors
        .map(
          (error) =>
            error.message
        )
        .join("; ")
    );
  }

  return (
    json.data
      ?.viewer
      ?.zones?.[0]
      ?.groups ??
    []
  );
}

export async function fetchCloudflarePageTraffic({
  zoneId,
  apiToken,
  since,
  until,
}: FetchPageTrafficParams): Promise<FetchPageTrafficResult> {
  const rows:
    PageTrafficRow[] = [];

  const skippedDays:
    PageTrafficSkippedDay[] =
      [];

  for (
    const day of
    enumerateDates(
      since,
      until
    )
  ) {
    try {
      const groups =
        await fetchOneDayPageTraffic(
          zoneId,
          apiToken,
          day
        );

      rows.push(
        ...aggregatePageTrafficGroups(
          day,
          groups
        )
      );
    } catch (
      error
    ) {
      const reason =
        error instanceof Error
          ? error.message
          : "Unknown Cloudflare page traffic error";

      skippedDays.push({
        date:
          day,

        reason,
      });

      console.warn(
        "[cloudflare page traffic unavailable]",
        day,
        reason
      );
    }
  }

  return {
    rows,
    skippedDays,
  };
}
