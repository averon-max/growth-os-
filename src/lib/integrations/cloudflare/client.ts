import type {
  CloudflareGraphQLResponse,
  CloudflareDailySummaryResponse,
  CloudflareDailyGroup,
  DailyTrafficData,
  TrafficByCountry,
  TrafficByDevice,
  TrafficByBotCategory,
} from "./types";

const CLOUDFLARE_GRAPHQL_ENDPOINT =
  "https://api.cloudflare.com/client/v4/graphql";

const CLOUDFLARE_API_BASE =
  "https://api.cloudflare.com/client/v4";

interface FetchTrafficParams {
  zoneId: string;
  apiToken: string;
  since: string;
  until: string;
}

export interface SkippedDay {
  date: string;
  reason: string;
}

export interface FetchTrafficResult {
  days: DailyTrafficData[];
  skippedDays: SkippedDay[];
}

interface DailySummary {
  date: string;
  totalRequests: number;
  uniqueVisitors: number;
  bandwidthBytes: number;
}

interface AdaptiveDetail {
  totalRequests: number;
  byCountry: TrafficByCountry[];
  byDevice: TrafficByDevice[];
  byBotCategory: TrafficByBotCategory[];
}

interface ZoneAnalyticsResponse {
  success?: boolean;
  errors?: Array<{
    code?: number;
    message?: string;
  }>;
  result?: {
    totals?: {
      requests?: {
        all?: number;
      };
      bandwidth?: {
        all?: number;
      };
      uniques?: {
        all?: number;
      };
    };
  };
}

const DAILY_SUMMARY_QUERY = `
  query GetDailyTraffic(
    $zoneTag: String!
    $since: Date!
    $until: Date!
  ) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        groups: httpRequests1dGroups(
          limit: 100
          filter: {
            date_geq: $since
            date_leq: $until
          }
          orderBy: [date_ASC]
        ) {
          dimensions {
            date
          }
          sum {
            requests
            bytes
          }
          uniq {
            uniques
          }
        }
      }
    }
  }
`;

const ADAPTIVE_QUERY = `
  query GetTraffic(
    $zoneTag: String!
    $day: Date!
  ) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        groups: httpRequestsAdaptiveGroups(
          limit: 10000
          filter: { date: $day }
          orderBy: [date_ASC]
        ) {
          count
          dimensions {
            date
            clientCountryName
            clientDeviceType
            verifiedBotCategory
          }
          sum {
            visits
            edgeResponseBytes
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
  const dates: string[] = [];

  const current =
    new Date(`${since}T00:00:00Z`);

  const end =
    new Date(`${until}T00:00:00Z`);

  while (current <= end) {
    dates.push(
      current.toISOString().slice(0, 10)
    );

    current.setUTCDate(
      current.getUTCDate() + 1
    );
  }

  return dates;
}

function nextDate(day: string): string {
  const date =
    new Date(`${day}T00:00:00Z`);

  date.setUTCDate(
    date.getUTCDate() + 1
  );

  return date.toISOString().slice(0, 10);
}

async function fetchDailySummaryGraphQL(
  zoneId: string,
  apiToken: string,
  since: string,
  until: string
): Promise<DailySummary[]> {
  const response =
    await fetch(
      CLOUDFLARE_GRAPHQL_ENDPOINT,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiToken}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          query:
            DAILY_SUMMARY_QUERY,

          variables: {
            zoneTag: zoneId,
            since,
            until,
          },
        }),
      }
    );

  const json =
    await response.json() as
      CloudflareDailySummaryResponse;

  if (!response.ok) {
    throw new Error(
      `Cloudflare GraphQL HTTP ${response.status}`
    );
  }

  if (json.errors?.length) {
    throw new Error(
      json.errors
        .map((error) => error.message)
        .join("; ")
    );
  }

  const groups =
    json.data?.viewer
      ?.zones?.[0]
      ?.groups ?? [];

  return groups.map((group) => ({
    date:
      group.dimensions.date,

    totalRequests:
      Number(group.sum.requests) || 0,

    uniqueVisitors:
      Number(group.uniq.uniques) || 0,

    bandwidthBytes:
      Number(group.sum.bytes) || 0,
  }));
}

async function fetchDailySummaryRest(
  zoneId: string,
  apiToken: string,
  day: string
): Promise<DailySummary> {
  const start =
    `${day}T00:00:00Z`;

  const end =
    `${nextDate(day)}T00:00:00Z`;

  const params =
    new URLSearchParams({
      since: start,
      until: end,
      continuous: "false",
    });

  const response =
    await fetch(
      `${CLOUDFLARE_API_BASE}/zones/${encodeURIComponent(
        zoneId
      )}/analytics/dashboard?${params.toString()}`,
      {
        headers: {
          Authorization:
            `Bearer ${apiToken}`,
        },
      }
    );

  const json =
    await response.json() as
      ZoneAnalyticsResponse;

  if (
    !response.ok ||
    json.success === false
  ) {
    const reason =
      json.errors
        ?.map((error) =>
          error.message ??
          String(error.code ?? "")
        )
        .filter(Boolean)
        .join("; ");

    throw new Error(
      reason ||
      `Cloudflare analytics HTTP ${response.status}`
    );
  }

  const totals =
    json.result?.totals;

  if (!totals) {
    throw new Error(
      "Cloudflare analytics returned no totals"
    );
  }

  return {
    date: day,

    totalRequests:
      Number(
        totals.requests?.all ?? 0
      ),

    uniqueVisitors:
      Number(
        totals.uniques?.all ?? 0
      ),

    bandwidthBytes:
      Number(
        totals.bandwidth?.all ?? 0
      ),
  };
}

async function fetchOneDayAdaptive(
  zoneId: string,
  apiToken: string,
  day: string
): Promise<CloudflareDailyGroup[]> {
  const response =
    await fetch(
      CLOUDFLARE_GRAPHQL_ENDPOINT,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiToken}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          query:
            ADAPTIVE_QUERY,

          variables: {
            zoneTag: zoneId,
            day,
          },
        }),
      }
    );

  const json =
    await response.json() as
      CloudflareGraphQLResponse;

  if (!response.ok) {
    throw new Error(
      `Cloudflare GraphQL HTTP ${response.status}`
    );
  }

  if (json.errors?.length) {
    throw new Error(
      json.errors
        .map((error) => error.message)
        .join("; ")
    );
  }

  return (
    json.data?.viewer
      ?.zones?.[0]
      ?.groups ?? []
  );
}

function aggregateAdaptive(
  groups: CloudflareDailyGroup[]
): AdaptiveDetail {
  const byCountry:
    TrafficByCountry[] = [];

  const byDevice:
    TrafficByDevice[] = [];

  const byBotCategory:
    TrafficByBotCategory[] = [];

  let totalRequests = 0;

  for (const group of groups) {
    const requests =
      Number(group.count) || 0;

    const visits =
      Number(
        group.sum.visits
      ) || 0;

    totalRequests += requests;

    upsertCountry(
      byCountry,
      group.dimensions
        .clientCountryName,
      requests,
      visits
    );

    upsertDevice(
      byDevice,
      group.dimensions
        .clientDeviceType,
      requests,
      visits
    );

    upsertBotCategory(
      byBotCategory,
      group.dimensions
        .verifiedBotCategory,
      requests
    );
  }

  return {
    totalRequests,
    byCountry,
    byDevice,
    byBotCategory,
  };
}

export async function fetchCloudflareTraffic({
  zoneId,
  apiToken,
  since,
  until,
}: FetchTrafficParams): Promise<FetchTrafficResult> {
  const requestedDates =
    enumerateDates(
      since,
      until
    );

  const summaryByDate =
    new Map<
      string,
      DailySummary
    >();

  const summaryErrors =
    new Map<
      string,
      string
    >();

  try {
    const summaries =
      await fetchDailySummaryGraphQL(
        zoneId,
        apiToken,
        since,
        until
      );

    for (const summary of summaries) {
      summaryByDate.set(
        summary.date,
        summary
      );
    }
  } catch (error) {
    console.warn(
      "[cloudflare daily summary graphql]",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );
  }

  const missingAfterGraphQL =
    requestedDates.filter(
      (day) =>
        !summaryByDate.has(day)
    );

  for (
    const day of
    missingAfterGraphQL
  ) {
    try {
      const summary =
        await fetchDailySummaryRest(
          zoneId,
          apiToken,
          day
        );

      summaryByDate.set(
        day,
        summary
      );
    } catch (error) {
      const reason =
        error instanceof Error
          ? error.message
          : "Unknown Cloudflare summary error";

      summaryErrors.set(
        day,
        reason
      );

      console.warn(
        "[cloudflare summary unavailable]",
        day,
        reason
      );
    }
  }

  const resultDays:
    DailyTrafficData[] = [];

  const skippedDays:
    SkippedDay[] = [];

  for (
    const day of
    requestedDates
  ) {
    const summary =
      summaryByDate.get(day);

    if (!summary) {
      skippedDays.push({
        date: day,

        reason:
          summaryErrors.get(day) ??
          "No daily Cloudflare summary available",
      });

      continue;
    }

    let detail:
      AdaptiveDetail | null =
        null;

    try {
      const groups =
        await fetchOneDayAdaptive(
          zoneId,
          apiToken,
          day
        );

      detail =
        aggregateAdaptive(groups);
    } catch (error) {
      console.warn(
        "[cloudflare adaptive detail unavailable]",
        day,
        error instanceof Error
          ? error.message
          : "Unknown Cloudflare detail error"
      );
    }

    resultDays.push({
      date: day,

      totalRequests:
        summary.totalRequests,

      uniqueVisitors:
        summary.uniqueVisitors,

      bandwidthBytes:
        summary.bandwidthBytes,

      detailAvailable:
        detail !== null,

      detailTotalRequests:
        detail?.totalRequests ?? 0,

      byCountry:
        detail?.byCountry ?? [],

      byDevice:
        detail?.byDevice ?? [],

      byBotCategory:
        detail?.byBotCategory ?? [],
    });
  }

  return {
    days: resultDays,
    skippedDays,
  };
}

function upsertCountry(
  list: TrafficByCountry[],
  country: string,
  requests: number,
  visits: number
) {
  const existing =
    list.find(
      (item) =>
        item.country === country
    );

  if (existing) {
    existing.requests +=
      requests;

    existing.visits +=
      visits;

    return;
  }

  list.push({
    country,
    requests,
    visits,
  });
}

function upsertDevice(
  list: TrafficByDevice[],
  device: string,
  requests: number,
  visits: number
) {
  const existing =
    list.find(
      (item) =>
        item.device === device
    );

  if (existing) {
    existing.requests +=
      requests;

    existing.visits +=
      visits;

    return;
  }

  list.push({
    device,
    requests,
    visits,
  });
}

function upsertBotCategory(
  list: TrafficByBotCategory[],
  category: string,
  requests: number
) {
  const existing =
    list.find(
      (item) =>
        item.category ===
        category
    );

  if (existing) {
    existing.requests +=
      requests;

    return;
  }

  list.push({
    category,
    requests,
  });
}
