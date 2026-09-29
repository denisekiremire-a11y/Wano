/** Four L-shaped registration marks at the corners of a `relative` parent
 * — a viewfinder/blueprint annotation instead of a soft image border, used
 * sparingly on the one or two "lead" photos per page that should read as
 * precise rather than decorative. Color comes from `currentColor`, so wrap
 * in a text-color utility (e.g. `text-white/70`) to match the photo. */
export function CornerMarks({
  inset = 12,
  size = 16,
  className = "",
}: {
  inset?: number;
  size?: number;
  className?: string;
}) {
  const corners = [
    { top: inset, left: inset, rotate: 0 },
    { top: inset, right: inset, rotate: 90 },
    { bottom: inset, right: inset, rotate: 180 },
    { bottom: inset, left: inset, rotate: -90 },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {corners.map(({ rotate, ...position }, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          className={`absolute ${className}`}
          style={{ ...position, transform: `rotate(${rotate}deg)` }}
        >
          <path d="M0 0H8M0 0V8" stroke="currentColor" strokeWidth="1.25" />
        </svg>
      ))}
    </div>
  );
}
