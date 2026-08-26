export function iconMark(size: number) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0d2419 0%, #145a44 55%, #eeb840 130%)",
        borderRadius: size * 0.26,
      }}
    >
      <span
        style={{
          fontSize: size * 0.46,
          fontWeight: 800,
          color: "#eeb840",
          fontFamily: "sans-serif",
          letterSpacing: -1,
        }}
      >
        W
      </span>
    </div>
  );
}
