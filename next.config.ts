import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Auth-gated dynamic journal app: classic rendering (no static prerender) */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
