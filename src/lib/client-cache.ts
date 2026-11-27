/*
 * Last answers of the dashboard's own APIs, kept in the browser for a week.
 * A page shows them the moment it opens (no empty zeros), then replaces them with the fresh answer.
 * Only this browser and only the signed-in user's own data; nothing here is sent anywhere.
 */
const PREFIX = "hx:v1:";
const WEEK = 7 * 864e5;

export function readCache<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { at, v } = JSON.parse(raw) as { at: number; v: T };
    return Date.now() - at < WEEK ? v : null;
  } catch {
    return null;
  }
}

export function writeCache(key: string, value: unknown) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), v: value }));
  } catch {
    /* storage full or blocked: the page just loads normally */
  }
}
