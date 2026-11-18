export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6" aria-busy="true" aria-label="Loading gifts">
      <div className="h-10 w-2/3 max-w-md animate-pulse rounded-full bg-linen" />
      <div className="mt-8 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="aspect-[4/5] animate-pulse bg-cream" />
            <div className="space-y-2 p-5">
              <div className="h-3 w-1/3 animate-pulse rounded bg-linen" />
              <div className="h-5 w-2/3 animate-pulse rounded bg-linen" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-linen" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
