export function iconMark(size: number) {
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
        borderRadius: size * 0.26,
      }}
    >
      <span
        style={{
          fontSize: size * 0.46,
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
