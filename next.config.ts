import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows the dev server (login/signup/booking actions, HMR, static assets)
  // to work when exposed through a Cloudflare quick tunnel (random
  // *.trycloudflare.com subdomain each run). Dev-only; remove before deploying.
  allowedDevOrigins: ["*.trycloudflare.com"],
  experimental: {
    serverActions: {
      allowedOrigins: ["*.trycloudflare.com"],
    },
  },
};

export default nextConfig;
