/**
 * Prisma mock for unit tests.
 * Intercepts @/lib/prisma so tests that import DB repository modules
 * do not require DATABASE_URL at import time.
 * No production code is modified.
 */
import { vi } from "vitest";

const handler: ProxyHandler<object> = {
  get(_target, prop) {
    // Return a proxy for any model (e.g. prisma.serpReplayArtifact.create)
    if (typeof prop === "string" && prop !== "then") {
      return new Proxy(
        {},
        {
          get(_t, method) {
            if (typeof method === "string") {
              return vi.fn().mockResolvedValue(null);
            }
            return undefined;
          },
        }
      );
    }
    return undefined;
  },
};

export const prisma = new Proxy({}, handler);
export default prisma;
