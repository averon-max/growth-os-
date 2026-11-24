/**
 * First line of defence against floods: a counter in this server's memory.
 * It costs nothing (no database, no network), so a burst from one address is turned away
 * before it can load the database. Each server instance counts on its own, so the numbers
 * are generous; the exact, shared limits are still enforced in Postgres for writes and paid work.
 */
type Slot = { count: number; resetAt: number };
const slots = new Map<string, Slot>();
const MAX_KEYS = 50_000;

export function burst(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const slot = slots.get(key);
  if (!slot || slot.resetAt <= now) {
    if (slots.size >= MAX_KEYS) prune(now);
    slots.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  slot.count++;
  return slot.count <= max;
}

function prune(now: number) {
  for (const [k, s] of slots) if (s.resetAt <= now) slots.delete(k);
  // Still full (a flood of distinct addresses): drop the oldest half instead of growing without bound.
  if (slots.size >= MAX_KEYS) {
    let i = 0;
    for (const k of slots.keys()) {
      if (i++ > MAX_KEYS / 2) break;
      slots.delete(k);
    }
  }
}
