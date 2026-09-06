// maskable=true drops the self-rounding and keeps the mark within Android's
// ~80% safe zone — the OS applies its own mask shape (circle, squircle,
// etc.) over the full-bleed background, so pre-rounding here would look
// doubly-inset once masked.
export function iconMark(size: number, maskable = false) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Rendered via next/og (Satori) for the PWA icon — no CSS variable
        // support there, so these are literal: text-primary, brand, warm.
        background: "linear-gradient(135deg, #1B3A5C 0%, #2C4A6E 55%, #B79B72 130%)",
        borderRadius: maskable ? 0 : size * 0.26,
      }}
    >
      <span
        style={{
          fontSize: size * (maskable ? 0.36 : 0.46),
          fontWeight: 800,
          color: "#B79B72", // warm
          fontFamily: "sans-serif",
          letterSpacing: -1,
        }}
      >
        W
      </span>
    </div>
  );
}
