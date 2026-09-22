export type RankSnapshotInput = {
  date: Date;
  position: number | null;
  impressions: number | null;
  clicks: number | null;
  pageUrl: string | null;
};

export type RankAggregate = {
  impressions: number;
  clicks: number;
  ctr: number | null;
  position: number | null;
  rankingUrl: string | null;
};

export function startOfUtcDay(
  value: Date
): Date {
  const date =
    new Date(
      value
    );

  date.setUTCHours(
    0,
    0,
    0,
    0
  );

  return date;
}

export function shiftUtcDays(
  value: Date,
  days: number
): Date {
  const date =
    startOfUtcDay(
      value
    );

  date.setUTCDate(
    date.getUTCDate() +
      days
  );

  return date;
}

export function dateKey(
  value: Date
): string {
  return startOfUtcDay(
    value
  )
    .toISOString()
    .slice(
      0,
      10
    );
}

export function aggregateRankSnapshots(
  snapshots: RankSnapshotInput[],
  start: Date,
  end: Date
): RankAggregate {
  const startTime =
    startOfUtcDay(
      start
    ).getTime();

  const endTime =
    startOfUtcDay(
      end
    ).getTime();

  let impressions =
    0;

  let clicks =
    0;

  let weightedPosition =
    0;

  let positionWeight =
    0;

  let fallbackPosition =
    0;

  let fallbackCount =
    0;

  const pageImpressions =
    new Map<
      string,
      number
    >();

  for (
    const snapshot of
    snapshots
  ) {
    const time =
      startOfUtcDay(
        snapshot.date
      ).getTime();

    if (
      time <
        startTime ||
      time >
        endTime
    ) {
      continue;
    }

    const snapshotImpressions =
      Math.max(
        0,
        snapshot.impressions ??
          0
      );

    const snapshotClicks =
      Math.max(
        0,
        snapshot.clicks ??
          0
      );

    impressions +=
      snapshotImpressions;

    clicks +=
      snapshotClicks;

    if (
      snapshot.position !==
        null &&
      Number.isFinite(
        snapshot.position
      ) &&
      snapshot.position >
        0
    ) {
      if (
        snapshotImpressions >
        0
      ) {
        weightedPosition +=
          snapshot.position *
          snapshotImpressions;

        positionWeight +=
          snapshotImpressions;
      } else {
        fallbackPosition +=
          snapshot.position;

        fallbackCount +=
          1;
      }
    }

    if (
      snapshot.pageUrl
    ) {
      pageImpressions.set(
        snapshot.pageUrl,
        (
          pageImpressions.get(
            snapshot.pageUrl
          ) ??
          0
        ) +
          snapshotImpressions
      );
    }
  }

  const position =
    positionWeight >
    0
      ? weightedPosition /
        positionWeight
      : fallbackCount >
          0
        ? fallbackPosition /
          fallbackCount
        : null;

  const rankingUrl =
    Array.from(
      pageImpressions.entries()
    )
      .sort(
        (
          a,
          b
        ) =>
          b[1] -
          a[1]
      )[0]?.[0] ??
    null;

  return {
    impressions,
    clicks,

    ctr:
      impressions >
      0
        ? clicks /
          impressions
        : null,

    position,
    rankingUrl,
  };
}

export function positionDelta(
  current: number | null,
  previous: number | null
): number | null {
  if (
    current ===
      null ||
    previous ===
      null
  ) {
    return null;
  }

  return (
    previous -
    current
  );
}

export function classifyKeyword(
  position: number | null,
  delta7d: number | null,
  impressions: number
):
  | "TOP"
  | "QUICK_WIN"
  | "RISING"
  | "DECLINING"
  | "NO_VISIBILITY"
  | "IMPROVE" {
  if (
    position ===
      null ||
    impressions ===
      0
  ) {
    return "NO_VISIBILITY";
  }

  if (
    position <=
    3
  ) {
    return "TOP";
  }

  if (
    delta7d !==
      null &&
    delta7d <=
      -2
  ) {
    return "DECLINING";
  }

  if (
    position <=
    20
  ) {
    return "QUICK_WIN";
  }

  if (
    delta7d !==
      null &&
    delta7d >=
      2
  ) {
    return "RISING";
  }

  return "IMPROVE";
}

export function opportunityScore(
  position: number | null,
  delta7d: number | null,
  impressions: number,
  volume: number | null
): number {
  let score =
    0;

  if (
    position !==
    null
  ) {
    if (
      position >=
        4 &&
      position <=
        20
    ) {
      score +=
        50;
    } else if (
      position >
        20 &&
      position <=
        50
    ) {
      score +=
        28;
    } else if (
      position <=
      3
    ) {
      score +=
        8;
    } else {
      score +=
        12;
    }
  }

  if (
    volume !==
      null &&
    volume >
      0
  ) {
    score +=
      Math.min(
        25,
        Math.log10(
          volume +
            1
        ) *
          6
      );
  } else if (
    impressions >
    0
  ) {
    score +=
      Math.min(
        15,
        Math.log10(
          impressions +
            1
        ) *
          4
      );
  }

  if (
    delta7d !==
      null
  ) {
    score +=
      Math.max(
        -10,
        Math.min(
          15,
          delta7d *
            2
        )
      );
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        score
      )
    )
  );
}
