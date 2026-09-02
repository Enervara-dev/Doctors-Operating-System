import type { NextConfig } from "next";

/**
 * The browser always talks to a same-origin `/api/*`; Next proxies it to the
 * Express service. That keeps the client free of CORS concerns and lets the API
 * move behind a gateway later without touching frontend code.
 */
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
  },
};

export default nextConfig;
