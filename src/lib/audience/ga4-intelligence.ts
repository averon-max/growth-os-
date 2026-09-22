import "server-only";

import {
  prisma,
} from "@/lib/prisma";

import {
  decryptToken,
  encryptToken,
} from "@/lib/integrations/token-crypto";

import {
  createGoogleOAuthClient,
} from "@/lib/integrations/google/oauth-client";

const DATA_API =
  "https://analyticsdata.googleapis.com/v1beta";

const ADMIN_API =
  "https://analyticsadmin.googleapis.com/v1beta";

export interface Ga4Property {
  id: string;
  displayName: string;
  accountName:
    string | null;
}

interface GoogleError {
  error?: {
    message?: string;
    status?: string;
    code?: number;
  };
}

interface Header {
  name?: string;
}

interface DimensionValue {
  value?: string;
}

interface MetricValue {
  value?: string;
}

interface ReportRow {
  dimensionValues?:
    DimensionValue[];

  metricValues?:
    MetricValue[];
}

interface ReportResponse
  extends GoogleError {
  dimensionHeaders?:
    Header[];

  metricHeaders?:
    Header[];

  rows?:
    ReportRow[];

  rowCount?: number;
}

interface AccountSummariesResponse
  extends GoogleError {
  accountSummaries?:
    Array<{
      account?:
        string;

      displayName?:
        string;

      propertySummaries?:
        Array<{
          property?:
            string;

          displayName?:
            string;
        }>;
    }>;
}

export interface Ga4Context {
  websiteId: string;
  workspaceId: string;
  ga4PropertyId:
    string | null;
}

function propertyId(
  value: string
): string {
  return value
    .trim()
    .replace(
      /^properties\//,
      ""
    );
}

function num(
  value: string | undefined
): number {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

export async function getGa4Context(
  websiteId: string
): Promise<Ga4Context> {
  const website =
    await prisma.website.findUnique({
      where: {
        id:
          websiteId,
      },

      select: {
        id: true,

        ga4PropertyId:
          true,

        business: {
          select: {
            workspaceId:
              true,
          },
        },
      },
    });

  if (!website) {
    throw new Error(
      "WEBSITE_NOT_FOUND"
    );
  }

  return {
    websiteId:
      website.id,

    workspaceId:
      website.business
        .workspaceId,

    ga4PropertyId:
      website.ga4PropertyId,
  };
}

export async function getGa4AccessToken(
  workspaceId: string
): Promise<string | null> {
  const connection =
    await prisma.providerConnection.findUnique({
      where: {
        workspaceId_provider: {
          workspaceId,

          provider:
            "GOOGLE_ANALYTICS_4",
        },
      },
    });

  if (
    !connection ||
    connection.status !==
      "CONNECTED" ||
    !connection.accessTokenRef
  ) {
    return null;
  }

  const previousAccess =
    decryptToken(
      connection.accessTokenRef
    );

  const refreshToken =
    connection.refreshTokenRef
      ? decryptToken(
          connection.refreshTokenRef
        )
      : undefined;

  const client =
    createGoogleOAuthClient();

  client.setCredentials({
    access_token:
      previousAccess,

    refresh_token:
      refreshToken,

    expiry_date:
      connection.expiresAt
        ?.getTime(),
  });

  const result =
    await client.getAccessToken();

  const token =
    result.token;

  if (!token) {
    throw new Error(
      "Google Analytics authorization could not be refreshed."
    );
  }

  const nextExpiry =
    client.credentials
      .expiry_date
      ? new Date(
          client.credentials
            .expiry_date
        )
      : null;

  const refreshedToken =
    client.credentials
      .refresh_token;

  const changed =
    token !==
      previousAccess ||
    (
      nextExpiry?.getTime() ??
      null
    ) !==
      (
        connection.expiresAt
          ?.getTime() ??
        null
      ) ||
    (
      refreshedToken &&
      refreshedToken !==
        refreshToken
    );

  if (changed) {
    await prisma.providerConnection.update({
      where: {
        id:
          connection.id,
      },

      data: {
        accessTokenRef:
          encryptToken(
            token
          ),

        expiresAt:
          nextExpiry,

        ...(refreshedToken &&
        refreshedToken !==
          refreshToken
          ? {
              refreshTokenRef:
                encryptToken(
                  refreshedToken
                ),
            }
          : {}),
      },
    });
  }

  return token;
}

async function googleJson<T>(
  url: string,
  token: string,
  init?:
    RequestInit
): Promise<T> {
  const response =
    await fetch(
      url,
      {
        ...init,

        headers: {
          Authorization:
            `Bearer ${token}`,

          "Content-Type":
            "application/json",

          ...(init?.headers ??
            {}),
        },

        cache:
          "no-store",
      }
    );

  const json: T & GoogleError =
    await response.json();

  if (
    !response.ok ||
    json.error
  ) {
    throw new Error(
      json.error?.message ??
      `Google Analytics API HTTP ${response.status}`
    );
  }

  return json;
}

export async function listAccessibleGa4Properties(
  token: string
): Promise<Ga4Property[]> {
  try {
    const data =
      await googleJson<AccountSummariesResponse>(
        `${ADMIN_API}/accountSummaries?pageSize=200`,
        token
      );

    const result:
      Ga4Property[] = [];

    for (
      const account of
      data.accountSummaries ??
      []
    ) {
      for (
        const property of
        account.propertySummaries ??
        []
      ) {
        if (
          !property.property
        ) {
          continue;
        }

        result.push({
          id:
            propertyId(
              property.property
            ),

          displayName:
            property.displayName ??
            property.property,

          accountName:
            account.displayName ??
            null,
        });
      }
    }

    return result;
  } catch (error) {
    console.warn(
      "[GA4 property discovery]",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return [];
  }
}

interface RunReportInput {
  propertyId: string;
  token: string;

  startDate: string;
  endDate: string;

  dimensions?:
    string[];

  metrics:
    string[];

  country?:
    string | null;

  limit?:
    number;

  orderMetric?:
    string;
}

async function runReport({
  propertyId:
    id,
  token,
  startDate,
  endDate,
  dimensions = [],
  metrics,
  country,
  limit = 100,
  orderMetric,
}: RunReportInput): Promise<ReportResponse> {
  const body:
    Record<string, unknown> = {
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],

      dimensions:
        dimensions.map(
          (name) => ({
            name,
          })
        ),

      metrics:
        metrics.map(
          (name) => ({
            name,
          })
        ),

      limit,
    };

  if (country) {
    body.dimensionFilter = {
      filter: {
        fieldName:
          "country",

        stringFilter: {
          matchType:
            "EXACT",

          value:
            country,

          caseSensitive:
            false,
        },
      },
    };
  }

  if (orderMetric) {
    body.orderBys = [
      {
        metric: {
          metricName:
            orderMetric,
        },

        desc: true,
      },
    ];
  }

  return googleJson<ReportResponse>(
    `${DATA_API}/properties/${encodeURIComponent(
      propertyId(id)
    )}:runReport`,
    token,
    {
      method:
        "POST",

      body:
        JSON.stringify(
          body
        ),
    }
  );
}

async function runRealtime(
  id: string,
  token: string,
  country?: string | null
): Promise<ReportResponse> {
  const body:
    Record<string, unknown> = {
      dimensions: [
        {
          name:
            "country",
        },

        {
          name:
            "countryId",
        },
      ],

      metrics: [
        {
          name:
            "activeUsers",
        },
      ],

      limit:
        100,

      orderBys: [
        {
          metric: {
            metricName:
              "activeUsers",
          },

          desc: true,
        },
      ],
    };

  if (country) {
    body.dimensionFilter = {
      filter: {
        fieldName:
          "country",

        stringFilter: {
          matchType:
            "EXACT",

          value:
            country,

          caseSensitive:
            false,
        },
      },
    };
  }

  return googleJson<ReportResponse>(
    `${DATA_API}/properties/${encodeURIComponent(
      propertyId(id)
    )}:runRealtimeReport`,
    token,
    {
      method:
        "POST",

      body:
        JSON.stringify(
          body
        ),
    }
  );
}

function rows(
  report: ReportResponse
): Array<
  Record<string, string>
> {
  const dimensions =
    report.dimensionHeaders
      ?.map(
        (header) =>
          header.name ??
          ""
      ) ??
    [];

  const metrics =
    report.metricHeaders
      ?.map(
        (header) =>
          header.name ??
          ""
      ) ??
    [];

  return (
    report.rows ??
    []
  ).map(
    (row) => {
      const result:
        Record<
          string,
          string
        > = {};

      dimensions.forEach(
        (
          name,
          index
        ) => {
          if (!name) {
            return;
          }

          result[name] =
            row.dimensionValues?.[
              index
            ]?.value ??
            "";
        }
      );

      metrics.forEach(
        (
          name,
          index
        ) => {
          if (!name) {
            return;
          }

          result[name] =
            row.metricValues?.[
              index
            ]?.value ??
            "0";
        }
      );

      return result;
    }
  );
}

function reportDateRange(
  days: number,
  mode: string
): {
  startDate: string;
  endDate: string;
  label: string;
} {
  if (
    mode !==
    "history"
  ) {
    return {
      startDate:
        "today",

      endDate:
        "today",

      label:
        "Today",
    };
  }

  return {
    startDate:
      `${days}daysAgo`,

    endDate:
      "yesterday",

    label:
      `Last ${days} complete days`,
  };
}

export async function verifyGa4PropertyAccess(
  id: string,
  token: string
): Promise<void> {
  await runReport({
    propertyId:
      id,

    token,

    startDate:
      "yesterday",

    endDate:
      "yesterday",

    metrics: [
      "activeUsers",
    ],

    limit:
      1,
  });
}

export async function saveGa4Property(
  websiteId: string,
  id: string
): Promise<void> {
  await prisma.website.update({
    where: {
      id:
        websiteId,
    },

    data: {
      ga4PropertyId:
        propertyId(
          id
        ),
    },
  });
}

export async function getGa4Intelligence({
  propertyId:
    id,
  token,
  days,
  mode,
  country,
}: {
  propertyId: string;
  token: string;
  days: number;
  mode: string;
  country?: string | null;
}) {
  const range =
    reportDateRange(
      days,
      mode
    );

  const [
    summaryReport,
    timelineReport,
    countryReport,
    cityReport,
    deviceReport,
    acquisitionReport,
    landingReport,
    realtimeReport,
  ] =
    await Promise.all([
      runReport({
        propertyId:
          id,

        token,

        startDate:
          range.startDate,

        endDate:
          range.endDate,

        country,

        metrics: [
          "activeUsers",
          "newUsers",
          "sessions",
          "engagedSessions",
          "engagementRate",
          "screenPageViews",
          "eventCount",
        ],

        limit:
          1,
      }),

      runReport({
        propertyId:
          id,

        token,

        startDate:
          range.startDate,

        endDate:
          range.endDate,

        country,

        dimensions: [
          "date",
        ],

        metrics: [
          "activeUsers",
          "sessions",
          "screenPageViews",
        ],

        limit:
          100,

        orderMetric:
          "sessions",
      }),

      runReport({
        propertyId:
          id,

        token,

        startDate:
          range.startDate,

        endDate:
          range.endDate,

        country,

        dimensions: [
          "country",
          "countryId",
        ],

        metrics: [
          "activeUsers",
          "sessions",
          "engagedSessions",
          "screenPageViews",
        ],

        limit:
          250,

        orderMetric:
          "activeUsers",
      }),

      runReport({
        propertyId:
          id,

        token,

        startDate:
          range.startDate,

        endDate:
          range.endDate,

        country,

        dimensions: [
          "country",
          "countryId",
          "city",
        ],

        metrics: [
          "activeUsers",
          "sessions",
        ],

        limit:
          100,

        orderMetric:
          "activeUsers",
      }),

      runReport({
        propertyId:
          id,

        token,

        startDate:
          range.startDate,

        endDate:
          range.endDate,

        country,

        dimensions: [
          "deviceCategory",
        ],

        metrics: [
          "activeUsers",
          "sessions",
        ],

        limit:
          20,

        orderMetric:
          "activeUsers",
      }),

      runReport({
        propertyId:
          id,

        token,

        startDate:
          range.startDate,

        endDate:
          range.endDate,

        country,

        dimensions: [
          "sessionSourceMedium",
        ],

        metrics: [
          "activeUsers",
          "sessions",
          "engagedSessions",
        ],

        limit:
          40,

        orderMetric:
          "sessions",
      }),

      runReport({
        propertyId:
          id,

        token,

        startDate:
          range.startDate,

        endDate:
          range.endDate,

        country,

        dimensions: [
          "landingPagePlusQueryString",
        ],

        metrics: [
          "activeUsers",
          "sessions",
          "screenPageViews",
        ],

        limit:
          40,

        orderMetric:
          "sessions",
      }),

      runRealtime(
        id,
        token,
        country
      ).catch(
        (error) => {
          console.warn(
            "[GA4 realtime]",
            error instanceof Error
              ? error.message
              : "Unknown error"
          );

          return {
            rows:
              [],
          } as ReportResponse;
        }
      ),
    ]);

  const summary =
    rows(
      summaryReport
    )[0] ??
    {};

  const countryRows =
    rows(
      countryReport
    );

  const realtimeRows =
    rows(
      realtimeReport
    );

  return {
    propertyId:
      propertyId(id),

    filterCountry:
      country ??
      null,

    period: {
      ...range,
      days,
      mode,
    },

    summary: {
      activeUsers:
        num(
          summary.activeUsers
        ),

      newUsers:
        num(
          summary.newUsers
        ),

      sessions:
        num(
          summary.sessions
        ),

      engagedSessions:
        num(
          summary.engagedSessions
        ),

      engagementRate:
        num(
          summary.engagementRate
        ),

      screenPageViews:
        num(
          summary.screenPageViews
        ),

      eventCount:
        num(
          summary.eventCount
        ),
    },

    timeline:
      rows(
        timelineReport
      ).map(
        (row) => ({
          date:
            row.date,

          activeUsers:
            num(
              row.activeUsers
            ),

          sessions:
            num(
              row.sessions
            ),

          pageViews:
            num(
              row.screenPageViews
            ),
        })
      ),

    countries:
      countryRows.map(
        (row) => ({
          country:
            row.country,

          countryId:
            row.countryId,

          activeUsers:
            num(
              row.activeUsers
            ),

          sessions:
            num(
              row.sessions
            ),

          engagedSessions:
            num(
              row.engagedSessions
            ),

          pageViews:
            num(
              row.screenPageViews
            ),
        })
      ),

    cities:
      rows(
        cityReport
      ).map(
        (row) => ({
          country:
            row.country,

          countryId:
            row.countryId,

          city:
            row.city,

          activeUsers:
            num(
              row.activeUsers
            ),

          sessions:
            num(
              row.sessions
            ),
        })
      ),

    devices:
      rows(
        deviceReport
      ).map(
        (row) => ({
          device:
            row.deviceCategory,

          activeUsers:
            num(
              row.activeUsers
            ),

          sessions:
            num(
              row.sessions
            ),
        })
      ),

    acquisition:
      rows(
        acquisitionReport
      ).map(
        (row) => ({
          sourceMedium:
            row.sessionSourceMedium,

          activeUsers:
            num(
              row.activeUsers
            ),

          sessions:
            num(
              row.sessions
            ),

          engagedSessions:
            num(
              row.engagedSessions
            ),
        })
      ),

    landingPages:
      rows(
        landingReport
      ).map(
        (row) => ({
          path:
            row.landingPagePlusQueryString,

          activeUsers:
            num(
              row.activeUsers
            ),

          sessions:
            num(
              row.sessions
            ),

          pageViews:
            num(
              row.screenPageViews
            ),
        })
      ),

    realtime: {
      activeUsers:
        realtimeRows.reduce(
          (
            total,
            row
          ) =>
            total +
            num(
              row.activeUsers
            ),
          0
        ),

      countries:
        realtimeRows.map(
          (row) => ({
            country:
              row.country,

            countryId:
              row.countryId,

            activeUsers:
              num(
                row.activeUsers
              ),
          })
        ),
    },
  };
}
