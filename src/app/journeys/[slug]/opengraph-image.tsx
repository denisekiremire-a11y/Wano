import { ImageResponse } from "next/og";
import { getJourneyBySlug } from "@/lib/data/journeys";
import { journeyTheme } from "@/lib/journey-theme";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const journey = await getJourneyBySlug(slug);
  const theme = journeyTheme(slug);
  const title = journey?.name ?? "Wano Journeys";
  const tagline = journey?.tagline ?? journey?.description ?? "";
  const meta = [journey?.location, journey?.durationDays ? `${journey.durationDays} days` : null]
    .filter(Boolean)
    .join(" · ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: `linear-gradient(135deg, ${theme.hero} 0%, #0F2238 130%)`,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: theme.buttonText === "#ffffff" ? "#ffffff" : theme.tagBg,
            opacity: 0.85,
          }}
        >
          WANO JOURNEYS
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: title.length > 30 ? 60 : 76,
              fontWeight: 800,
              lineHeight: 1.1,
              color: "#ffffff",
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          {tagline && (
            <div style={{ display: "flex", marginTop: 20, fontSize: 30, color: "#E7D9C4", maxWidth: 900 }}>
              {tagline}
            </div>
          )}
          {meta && (
            <div style={{ display: "flex", marginTop: 16, fontSize: 26, color: "#ffffff", opacity: 0.75 }}>
              {meta}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
