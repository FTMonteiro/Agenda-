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
};

export default nextConfig;
