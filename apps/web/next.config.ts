import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @slotix/types is consumed as TypeScript source and now also exports runtime values
  // (the provinces/bairros list), so Next has to compile it.
  transpilePackages: ["@slotix/types"],
  // Read from .env.production at build time and inlined: on Vercel the .env files never
  // reach the functions at runtime, so without this the server code fell back to localhost.
  env: {
    NEXT_API_URL: process.env.NEXT_API_URL,
    NEXT_APP_URL: process.env.NEXT_APP_URL,
  },
  poweredByHeader: false,
  // Browser hardening for every page and route. The CSP only sets the directives that can't
  // break the app (no framing, no plugins, no <base> hijack, forms only to this site):
  // a script-src policy would need nonces for Next's inline scripts and the theme script.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
