
export default function QueueLoading() {
  return (
    <main className="min-h-screen space-y-6 bg-gray-50 p-4 dark:bg-gray-950 sm:p-6 lg:p-8">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-8 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-5 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        </div>

        <div className="h-9 w-32 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
      </div>

      {/* Add patient form skeleton */}
      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />

        <div className="h-11 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          <div className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        </div>

        <div className="h-11 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
      </section>

      {/* Filters skeleton */}
      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        <div className="flex gap-2">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-10 w-28 shrink-0 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      </section>

      {/* Statistics skeleton */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
          />
        ))}
      </section>

      {/* Status tabs skeleton */}
      <div className="flex gap-6 border-b border-gray-200 pb-3 dark:border-gray-800">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-6 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800"
          />
        ))}
      </div>

      {/* Patient cards skeleton */}
      <section className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
          />
        ))}
      </section>
    </main>
  );
}
