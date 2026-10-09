import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @slotix/types is consumed as TypeScript source and now also exports runtime values
  // (the provinces/bairros list), so Next has to compile it.
  transpilePackages: ["@slotix/types"],
};

export default nextConfig;
