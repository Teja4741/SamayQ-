
"use client";

import { useEffect } from "react";

type QueueErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function QueueError({
  error,
  reset,
}: QueueErrorProps) {
  useEffect(() => {
    console.error("Queue page error:", error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl dark:bg-red-950">
          ⚠️
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Unable to load queue
        </h2>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Something went wrong while loading the clinic queue.
          Please try again.
        </p>

        {error.digest && (
          <p className="mt-3 text-xs text-gray-400">
            Error reference: {error.digest}
          </p>
        )}

        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
