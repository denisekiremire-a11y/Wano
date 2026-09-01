export default function PassportLoading() {
  return (
    <main className="mx-auto max-w-4xl animate-pulse px-4 py-8 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 flex-none rounded-full bg-forest-100" />
          <div className="space-y-2">
            <div className="h-6 w-32 rounded bg-forest-100" />
            <div className="h-4 w-48 rounded bg-forest-50" />
          </div>
        </div>
        <div className="h-14 w-20 flex-none rounded-2xl bg-forest-50" />
      </div>

      <div className="mt-6 h-10 rounded-full bg-forest-50" />

      <div className="mt-6 space-y-3">
        <div className="h-32 rounded-2xl bg-forest-50" />
        <div className="h-24 rounded-2xl bg-forest-50" />
      </div>
    </main>
  );
}
