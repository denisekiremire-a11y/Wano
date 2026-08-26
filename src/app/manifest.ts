import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wano — Discover. Connect. Experience.",
    short_name: "Wano",
    description:
      "Wano is the social discovery platform for Kampala and Uganda — places, events, experiences, restaurants, communities, and bookings, all in one app.",
    start_url: "/",
    display: "standalone",
    background_color: "#f9f7f2",
    theme_color: "#0d2419",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icon", sizes: "512x512", type: "image/png" },
    ],
  };
}
