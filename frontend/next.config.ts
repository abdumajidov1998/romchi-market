import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Read at request-config time, not module-load time, so a
    // BACKEND_ORIGIN supplied only at runtime (e.g. on Render) is
    // honoured instead of the build-time `localhost` fallback.
    const BACKEND = process.env.BACKEND_ORIGIN || "http://localhost:3001";
    return [
      { source: "/api/:path*", destination: `${BACKEND}/api/:path*` },
      { source: "/uploads/:path*", destination: `${BACKEND}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
