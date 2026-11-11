
"use client";

import { useEffect, useState } from "react";

type QueueHeaderProps = {
  clinicName?: string;
};

export default function QueueHeader({
  clinicName,
}: QueueHeaderProps) {
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    );
  }, []);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
          <span>Dashboard</span>
          <span>/</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Queue
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          Queue
        </h1>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            Main queue
          </span>

          {clinicName && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {clinicName}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900 dark:bg-green-950">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>

          <span className="text-xs font-semibold text-green-700 dark:text-green-400">
            Live status
          </span>
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          {currentDate || "Loading date..."}
        </div>
      </div>
    </div>
  );
}
