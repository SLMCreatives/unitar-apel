import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Document uploads go through server actions; allow headroom above the
      // 10 MB per-file limit enforced in src/lib/documents.ts.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
