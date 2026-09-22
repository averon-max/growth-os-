export function normalizeOutcomeKeyword(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      " "
    );
}

export function shouldReuseRecentOutcomeAction(
  action: {
    status: string;
    source: string;
    createdAt: Date;
  } | null,
  nowMs = Date.now(),
  windowMs = 30_000
): boolean {
  if (
    !action ||
    action.status !== "PLANNED" ||
    action.source !== "GROWTH_OS_ACTION_PLAN_V1"
  ) {
    return false;
  }

  const age =
    nowMs -
    action.createdAt.getTime();

  return (
    age >= 0 &&
    age <= windowMs
  );
}
