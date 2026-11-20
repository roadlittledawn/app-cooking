import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local dev runs on http://cooking.localtest.me:3004 so the clang-auth cookie
  // (Domain=.localtest.me) reaches it; allow HMR from that host.
  allowedDevOrigins: ["cooking.localtest.me"],
  async redirects() {
    return [
      {
        // The old production alias. Previews have other hosts, so they keep working.
        source: "/:path*",
        has: [{ type: "host", value: "app-cooking.vercel.app" }],
        destination: "https://cooking.clintonlangosch.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
