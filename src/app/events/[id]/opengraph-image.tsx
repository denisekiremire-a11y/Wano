import { ImageResponse } from "next/og";
import { getEventById } from "@/lib/data/events";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function formatWhen(startAt: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(startAt);
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getEventById(id);
  const title = row?.event.title ?? "Wano";
  const category = row?.event.category ?? "";
  const location = row?.event.location ?? "";
  const when = row ? formatWhen(new Date(row.event.startAt)) : "";

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
          background: "linear-gradient(135deg, #1B3A5C 0%, #2C4A6E 55%, #0F2238 130%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          {category && (
            <div
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "#B79B72",
              }}
            >
              {category}
            </div>
          )}
          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: title.length > 40 ? 58 : 72,
              fontWeight: 800,
              lineHeight: 1.1,
              color: "#ffffff",
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 32, color: "#E7D9C4" }}>{when}</div>
          <div style={{ display: "flex", marginTop: 8, fontSize: 28, color: "#9FB2C6" }}>{location}</div>
          <div
            style={{
              display: "flex",
              marginTop: 32,
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 2,
              color: "#B79B72",
            }}
          >
            WANO
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
