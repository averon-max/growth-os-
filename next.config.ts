import type { NextConfig } from "next";

const dev = process.env.NODE_ENV === "development";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");
const noindex = { key: "X-Robots-Tag", value: "noindex, nofollow" };

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: { position: "bottom-right" },
  // Screenshots are served resized for each screen (AVIF/WebP) instead of the 3200px originals.
  images: {
    formats: ["image/webp"],
    qualities: [75, 90],
    minimumCacheTTL: 86400,
    // Local images may carry a query string (the Overview site preview: /api/site-preview?url=…).
    localPatterns: [{ pathname: "/**" }],
  },
  // One address for the whole site: www.hyprlyx.com → hyprlyx.com. Signing in with Google started on one host and
  // returned to the other lost its security cookies and failed "every other time".
  async redirects() {
    return [{ source: "/:path*", has: [{ type: "host", value: "www.hyprlyx.com" }], destination: "https://hyprlyx.com/:path*", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy", value: csp },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
      { source: "/dashboard", headers: [noindex] },
      { source: "/dashboard/:path*", headers: [noindex] },
      { source: "/api/:path*", headers: [noindex] },
    ];
  },
};

export default nextConfig;
