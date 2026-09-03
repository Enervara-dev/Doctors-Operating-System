import type { NextConfig } from "next";

/**
 * The browser always talks to a same-origin `/api/*`; Next proxies it to the
 * Express service. That keeps the client free of CORS concerns and lets the API
 * move behind a gateway later without touching frontend code.
 */
/**
 * `127.0.0.1` rather than `localhost`: in a container the API binds loopback
 * IPv4 only, and `localhost` can resolve to `::1` first.
 */
const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
  },
};

export default nextConfig;
