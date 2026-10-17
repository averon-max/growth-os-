/**
 * The reporting APIs and Cloudflare sync use the last N complete UTC days.
 * The current partial UTC day must never be included.
 */
export const ALLOWED_AUDIENCE_DAYS: ReadonlySet<number> = new Set([7, 15, 30]);

export function getCompletedUtcDayRange(
  days: number,
  now: Date
): Readonly<{ since: Date; until: Date }> {
  const until = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  until.setUTCDate(until.getUTCDate() - 1);

  const since = new Date(until);
  since.setUTCDate(since.getUTCDate() - (days - 1));
  return { since, until };
}
