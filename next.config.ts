import type { NextConfig } from "next";

/**
 * Sent on every response. The CSP deliberately leaves `script-src` alone: a
 * script policy needs per-request nonces, which force every page dynamic (see
 * node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
 * These directives need none of that and still shut out clickjacking, `<base>`
 * hijacking, plugin content and forms posting off-site.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
  // Older browsers that ignore frame-ancestors.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Report URLs carry account names and filters; keep them off other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
