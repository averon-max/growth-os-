import dns from "dns/promises";

const BLOCKED_HOSTS = [
  "localhost",
  "metadata.google.internal",
  "169.254.169.254",
  "100.100.100.200",
];

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\.0\.0\.0/,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^fd[0-9a-f]{2}:/i,
];

function isPrivateIp(ip: string): boolean {
  for (const range of PRIVATE_IP_RANGES) {
    if (range.test(ip)) return true;
  }
  return false;
}

export async function isSafeUrl(urlStr: string): Promise<{ safe: boolean; reason?: string }> {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return { safe: false, reason: "Invalid URL" };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return { safe: false, reason: "Unsafe protocol" };
  }

  const hostname = url.hostname.toLowerCase();

  if (BLOCKED_HOSTS.includes(hostname)) {
    return { safe: false, reason: `Blocked host: ${hostname}` };
  }

  if (isPrivateIp(hostname)) {
    return { safe: false, reason: `Private IP range: ${hostname}` };
  }

  // Resolve DNS and check resolved IPs
  try {
    const [ipv4, ipv6] = await Promise.allSettled([
      dns.resolve4(hostname),
      dns.resolve6(hostname),
    ]);

    const allIps: string[] = [];
    if (ipv4.status === "fulfilled") allIps.push(...ipv4.value);
    if (ipv6.status === "fulfilled") allIps.push(...ipv6.value);

    if (allIps.length === 0) {
      return { safe: false, reason: "Could not resolve hostname" };
    }

    for (const ip of allIps) {
      if (isPrivateIp(ip)) {
        return { safe: false, reason: `Resolved to private IP: ${ip}` };
      }
      if (BLOCKED_HOSTS.includes(ip)) {
        return { safe: false, reason: `Resolved to blocked IP: ${ip}` };
      }
    }
  } catch {
    return { safe: false, reason: "DNS resolution failed" };
  }

  return { safe: true };
}

export function isSameDomain(base: string, target: string): boolean {
  try {
    const baseUrl = new URL(base);
    const targetUrl = new URL(target);
    return baseUrl.hostname === targetUrl.hostname;
  } catch {
    return false;
  }
}

export function normalizeUrl(url: string, base?: string): string | null {
  try {
    const u = base ? new URL(url, base) : new URL(url);

    if (!["http:", "https:"].includes(u.protocol)) return null;

    // Remove fragment
    u.hash = "";

    // Remove common tracking params
    const trackingParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "fbclid", "gclid", "mc_eid", "ref", "_ga",
    ];
    for (const param of trackingParams) {
      u.searchParams.delete(param);
    }

    // Normalize trailing slash — keep root slash, remove others
    if (u.pathname !== "/" && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }

    return u.toString();
  } catch {
    return null;
  }
}
