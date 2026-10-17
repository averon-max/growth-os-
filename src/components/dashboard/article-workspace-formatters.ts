/** Pure article workspace presentation helpers extracted with unchanged behavior. */

export function slugify(
  value:
    string
) {
  return value
    .toLowerCase()
    .trim()
    .replace(
      /[^\p{L}\p{N}\s-]/gu,
      ""
    )
    .replace(
      /\s+/g,
      "-"
    )
    .replace(
      /-+/g,
      "-"
    );
}

export function formatNumber(
  value:
    number | null
) {
  if (
    value ===
    null
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits:
        1,
    }
  ).format(
    value
  );
}

export function shortDate(
  value:
    string
) {
  const date =
    new Date(
      `${value}T00:00:00Z`
    );

  return date.toLocaleDateString(
    "en-US",
    {
      month:
        "short",
      day:
        "numeric",
      timeZone:
        "UTC",
    }
  );
}

export function statusLabel(
  value:
    string
) {
  return value
    .toLowerCase()
    .replaceAll(
      "_",
      " "
    );
}

export function positionMove(
  current:
    number | null,
  previous:
    number | null
) {
  if (
    current ===
      null ||
    previous ===
      null
  ) {
    return null;
  }

  return Math.round(
    (
      previous -
      current
    ) *
      10
  ) /
    10;
}

export function deltaText(
  current:
    number,
  previous:
    number
) {
  const delta =
    current -
    previous;

  if (
    delta ===
    0
  ) {
    return "No change";
  }

  return `${delta > 0 ? "+" : ""}${formatNumber(
    delta
  )}`;
}
