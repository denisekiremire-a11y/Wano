import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows the dev server (login/signup/booking actions, HMR, static assets)
  // to work when exposed through a Cloudflare quick tunnel (random
  // *.trycloudflare.com subdomain each run). Dev-only; remove before deploying.
  allowedDevOrigins: ["*.trycloudflare.com"],
  experimental: {
    serverActions: {
      allowedOrigins: ["*.trycloudflare.com"],
      // Default 1MB is too small for KYC document uploads (PDFs/photos).
      bodySizeLimit: "10mb",
    },
  },
  // Profile/Bookings/Rewards/Settings/Home were folded into /passport (and
  // Explore) — keep the old URLs alive rather than letting them 404.
  async redirects() {
    return [
      { source: "/home", destination: "/explore", permanent: false },
      { source: "/profile", destination: "/passport", permanent: false },
      { source: "/bookings", destination: "/passport?tab=bookings", permanent: false },
      { source: "/rewards", destination: "/passport?tab=rewards", permanent: false },
      { source: "/settings", destination: "/passport?tab=account", permanent: false },
    ];
  },
};

export default nextConfig;
