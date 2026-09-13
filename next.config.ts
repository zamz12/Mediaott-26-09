import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // bullmq supports several optional Redis client backends; we only use
  // ioredis, so silence the harmless "module not found" warning for the
  // valkey-glide alternative it probes for at import time.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@valkey/valkey-glide": false,
    };
    return config;
  },
};

export default nextConfig;
