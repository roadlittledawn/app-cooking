import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: process.env.AUTH_GOOGLE_ID ? "true" : "",
  },
};

export default nextConfig;
