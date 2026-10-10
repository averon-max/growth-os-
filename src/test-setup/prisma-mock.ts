import { vi } from "vitest";

vi.mock("@/lib/prisma", () => {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
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
  return {
    prisma: new Proxy({}, handler),
    default: new Proxy({}, handler),
  };
});
