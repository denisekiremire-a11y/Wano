export function RatingBadge({ average, count }: { average: number; count: number }) {
  if (count === 0) {
    return <span className="text-xs text-forest-800/40">No reviews yet</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-forest-800">
      <span className="text-marigold-500">★</span>
      {average.toFixed(1)}
      <span className="text-forest-800/50">
        ({count} review{count === 1 ? "" : "s"})
      </span>
    </span>
  );
}
