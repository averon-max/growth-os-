import { prisma } from "@/lib/prisma";

/*
 * Sections an admin has closed for one user (Admin → user → Page access). Stored as a list of section keys
 * (the folder name under /dashboard, e.g. "content") in AppSetting "blocked:<userId>".
 * Checked on the page (sectionGate), on the API (proxy) and in the menu (hidden there).
 */
export const blockedKey = (userId: string) => `blocked:${userId}`;

const cache = new Map<string, { at: number; list: string[] }>();

export async function blockedSections(userId: string): Promise<string[]> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < 15_000) return hit.list;
  const row = await prisma.appSetting.findUnique({ where: { key: blockedKey(userId) } }).catch(() => null);
  const list = Array.isArray(row?.value) ? (row.value as unknown[]).filter((x): x is string => typeof x === "string") : [];
  cache.set(userId, { at: Date.now(), list });
  return list;
}

export function forgetBlocked(userId: string) {
  cache.delete(userId);
}
