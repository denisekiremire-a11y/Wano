import { ImageResponse } from "next/og";

// A faint, transparent-background pin mark used as a CSS background-image
// on the transactional email card (see email-template.ts) — real mail
// clients (Gmail, Apple Mail, Outlook.com) render background-image fine,
// classic Windows Outlook ignores it and just falls back to the plain card
// background, so this is pure decoration with no layout risk either way.
// Same rotated-square pin-drop shape as the in-app Logo mark (logo.tsx),
// simplified since next/og's renderer (Satori) doesn't support SVG masks —
// just transform + borderRadius, which it does support (see icon-mark.tsx).
const SIZE = 480;

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <div
          style={{
            width: SIZE * 0.6,
            height: SIZE * 0.6,
            background: "#1e150e",
            opacity: 0.05,
            borderRadius: "50% 50% 50% 0%",
            transform: "rotate(-45deg)",
          }}
        />
      </div>
    ),
    { width: SIZE, height: SIZE },
  );
}
