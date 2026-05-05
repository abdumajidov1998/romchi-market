import type { NextConfig } from "next";

// Next.js bakes rewrite destinations into routes-manifest.json at build
// time, so BACKEND_ORIGIN must be present when `next build` runs — not
// just at runtime. The Docker build image sets it via ARG/ENV so prod
// deploys never see the localhost fallback.
const BACKEND = process.env.BACKEND_ORIGIN || "http://localhost:3001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND}/api/:path*` },
      { source: "/uploads/:path*", destination: `${BACKEND}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
