"use client";

type QueueEmptyStateProps = {
  title?: string;
  description?: string;
};

export default function QueueEmptyState({
  title = "No patients found",
  description = "Patients added to this queue will appear here.",
}: QueueEmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-12 text-center dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl dark:bg-gray-800">
        👥
      </div>

      <h3 className="font-medium text-gray-800 dark:text-gray-200">
        {title}
      </h3>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}