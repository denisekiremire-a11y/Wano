/** Small "Wano creator" mark next to a creator's name. */
export function CreatorBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-ember/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ember ${className}`}
      title="Member of the Wano creator programme"
    >
      ★ Wano creator
    </span>
  );
}
