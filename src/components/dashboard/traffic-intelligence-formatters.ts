/** Pure Traffic dashboard presentation helpers extracted without behavior changes. */

export function formatNumber(
  value: number
): string {
  return new Intl.NumberFormat(
    "en-US",
    {
      notation:
        Math.abs(value) >= 10000
          ? "compact"
          : "standard",

      maximumFractionDigits: 1,
    }
  ).format(value);
}


export function formatBytes(
  value: number
): string {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB",
  ];

  const index =
    Math.min(
      Math.floor(
        Math.log(value) /
          Math.log(1024)
      ),
      units.length - 1
    );

  return `${(
    value /
    1024 ** index
  ).toFixed(
    index >= 2 ? 1 : 0
  )} ${units[index]}`;
}


export function percentage(
  value: number,
  total: number
): string {
  if (total <= 0) {
    return "—";
  }

  return `${(
    value /
    total *
    100
  ).toFixed(1)}%`;
}


export function median(
  values: number[]
): number {
  if (!values.length) {
    return 0;
  }

  const sorted =
    [...values].sort(
      (a, b) =>
        a - b
    );

  const middle =
    Math.floor(
      sorted.length / 2
    );

  if (
    sorted.length % 2 === 0
  ) {
    return (
      sorted[middle - 1] +
      sorted[middle]
    ) / 2;
  }

  return sorted[middle];
}


export function shortTime(
  value: string
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
}


export function shortDate(
  value: string
): string {
  const date =
    new Date(
      `${value}T00:00:00Z`
    );

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }
  ).format(date);
}
