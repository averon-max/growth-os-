import { prisma } from "@/lib/prisma";
import { DFS_CATEGORIES, SETTINGS_KEY, keepMs, normalizeDfs } from "./cache-settings";

/** Days saved keyword numbers stay fresh, from Settings → Data (0 = forever). */
export async function keywordKeepDays(): Promise<number> {
  const row = await prisma.appSetting.findUnique({ where: { key: SETTINGS_KEY } }).catch(() => null);
  return row ? normalizeDfs(row.value).days.keywords : DFS_CATEGORIES.keywords.def;
}

export const isFreshFor = (at: Date, days: number) => Date.now() - at.getTime() < keepMs(days);
