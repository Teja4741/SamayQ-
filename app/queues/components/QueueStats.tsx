
"use client";

import type { QueueStats as QueueStatsType } from "../types/index";

type QueueStatsProps = {
  stats: QueueStatsType;
};

const statCards = [
  {
    key: "active" as const,
    label: "Active patients",
    description: "Currently waiting",
    icon: "👥",
    styles:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  },
  {
    key: "missed" as const,
    label: "Missed patients",
    description: "Patients who missed their turn",
    icon: "⏰",
    styles:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  {
    key: "done" as const,
    label: "Completed patients",
    description: "Consultations completed",
    icon: "✓",
    styles:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300",
  },
];

export default function QueueStats({ stats }: QueueStatsProps) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {statCards.map((card) => (
        <div
          key={card.key}
          className={`rounded-xl border p-4 ${card.styles}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{card.label}</p>
            <span className="text-xl" aria-hidden="true">
              {card.icon}
            </span>
          </div>

          <p className="mt-3 text-3xl font-bold tabular-nums">
            {stats[card.key]}
          </p>

          <p className="mt-1 text-xs opacity-75">
            {card.description}
          </p>
        </div>
      ))}
    </section>
  );
}
