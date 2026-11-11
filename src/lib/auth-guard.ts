import "server-only";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/** Client IP as Vercel reports it. Vercel overwrites these headers, so they can't be spoofed there. */
export function clientIp(headers: Headers | Record<string, unknown> | undefined): string {
  const get = (k: string): string => {
    if (!headers) return "";
    if (headers instanceof Headers) return headers.get(k) ?? "";
    const v = headers[k];
    return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
  };
  return (get("x-real-ip") || get("x-forwarded-for").split(",")[0] || "unknown").trim();
}

/**
 * Rate limit stored in Postgres, so it holds across every serverless instance.
 * (An in-memory limiter resets on each cold start and each instance has its own copy.)
 * Returns true when the request is allowed.
 */
export async function limit(key: string, max: number, windowMs: number): Promise<boolean> {
  const id = createHash("sha256").update(key).digest("hex");
  const secs = Math.ceil(windowMs / 1000);
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "AuthRateLimit" ("key", "count", "resetAt")
      VALUES (${id}, 1, now() + make_interval(secs => ${secs}))
      ON CONFLICT ("key") DO UPDATE SET
        "count"   = CASE WHEN "AuthRateLimit"."resetAt" < now() THEN 1 ELSE "AuthRateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "AuthRateLimit"."resetAt" < now() THEN now() + make_interval(secs => ${secs}) ELSE "AuthRateLimit"."resetAt" END
      RETURNING "count"`;
    return (rows[0]?.count ?? 0) <= max;
  } catch (error) {
    console.error("[rate-limit]", error);
    return true; // never lock everyone out because the limiter itself failed
  }
}

/**
 * Blocks cross-site form posts (CSRF): the body must be real JSON and the request must come from our own site.
 * Returns an error message or null.
 */
export function checkRequest(req: Request): string | null {
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) return "Bad request";
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return "Bad request";
    } catch {
      return "Bad request";
    }
  }
  return null;
}

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX_BYTES = 72; // bcrypt ignores everything past 72 bytes

/** Checks a password. Returns an error message or null. */
export async function passwordProblem(password: string, email?: string): Promise<string | null> {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (Buffer.byteLength(password, "utf8") > PASSWORD_MAX_BYTES) return "That password is too long.";
  if (email && password.toLowerCase().includes(email.split("@")[0].toLowerCase()) && email.split("@")[0].length >= 4)
    return "Don't use your email in the password.";
  if (await isBreached(password)) return "This password has appeared in a data breach. Pick another one.";
  return null;
}

/**
 * Have I Been Pwned, k-anonymity: only the first 5 characters of the SHA-1 hash leave the server,
 * never the password. Fails open if the service is slow or down.
 */
async function isBreached(password: string): Promise<boolean> {
  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split("\n").some((line) => {
      const [hash, count] = line.trim().split(":");
      return hash === suffix && Number(count) > 0;
    });
  } catch {
    return false;
  }
}

let dummyHash: string | null = null;
/** Spend the same bcrypt time when the user doesn't exist, so response time doesn't reveal which emails are registered. */
export async function burnBcryptTime(password: string): Promise<void> {
  dummyHash ??= await bcrypt.hash("hyprlyx-timing-equalizer", 12);
  await bcrypt.compare(password, dummyHash);
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.toLowerCase().trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;
  return email;
}
