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
  // Profile/Settings/Home were folded into /passport (and Explore); Rewards
  // and Bookings later moved from /passport to their own /rewards page (see
  // its "?tab=" redirect for old /passport?tab=rewards|bookings links) —
  // keep all of these old URLs alive rather than letting them 404.
  async redirects() {
    return [
      { source: "/home", destination: "/explore", permanent: false },
      { source: "/profile", destination: "/passport", permanent: false },
      { source: "/bookings", destination: "/rewards?tab=bookings", permanent: false },
      { source: "/settings", destination: "/passport?tab=account", permanent: false },
    ];
  },
};

export default nextConfig;
