
"use client";

import type { QueueStatus } from "../types/index";

type QueueStatusTabsProps = {
  activeStatus: QueueStatus;
  counts?: {
    active: number;
    missed: number;
    done: number;
  };
  onStatusChange: (status: QueueStatus) => void;
};

const tabs: {
  id: QueueStatus;
  label: string;
}[] = [
  { id: "active", label: "Active" },
  { id: "missed", label: "Missed" },
  { id: "done", label: "Done" },
];

export default function QueueStatusTabs({
  activeStatus,
  counts = {
    active: 0,
    missed: 0,
    done: 0,
  },
  onStatusChange,
}: QueueStatusTabsProps) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100/90 p-1.5 dark:bg-slate-800">
      {tabs.map((tab) => {
        const selected = activeStatus === tab.id;
        const count = counts[tab.id] ?? 0;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onStatusChange(tab.id)}
            aria-pressed={selected}
            className={`flex min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-3.5 text-sm font-medium transition sm:text-base ${
              selected
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-500 hover:bg-white/40 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            <span>{tab.label}</span>

            <span
              className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                selected
                  ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
