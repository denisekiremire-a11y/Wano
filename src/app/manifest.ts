import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wano — Discover. Connect. Experience.",
    short_name: "Wano",
    description:
      "Wano is the social discovery platform for Kampala and Uganda — places, events, experiences, restaurants, communities, and bookings, all in one app.",
    start_url: "/",
    display: "standalone",
    // A web manifest is static JSON served to the browser — it can't
    // reference a CSS variable, so these mirror --color-bg-page and
    // --color-text-primary from globals.css literally. Keep in sync by hand.
    background_color: "#F4F8FC",
    theme_color: "#1B3A5C",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icon", sizes: "512x512", type: "image/png" },
    ],
  };
}
