
"use client";

import type {
  BookingMode,
  QueueFilter,
  QueuePatient,
} from "../types/index";

type QueueFiltersProps = {
  bookingMode: BookingMode;
  filters?: QueueFilter[];
  patients?: QueuePatient[];
  selectedFilter: string;
  onFilterChange: (filterId: string) => void;
};

export default function QueueFilters({
  bookingMode,
  filters = [],
  patients = [],
  selectedFilter,
  onFilterChange,
}: QueueFiltersProps) {
  const isDoctorMode = bookingMode === "doctor";

  const allFilter: QueueFilter = {
    id: "all",
    name: isDoctorMode ? "All Doctors" : "All Departments",
    type: "all",
  };

  const visibleFilters = [
    allFilter,
    ...filters.filter((filter) => filter.id !== "all"),
  ];

  function getCount(filterId: string) {
    if (filterId === "all") {
      return patients.filter(
        (patient) => patient.status === "active"
      ).length;
    }

    return patients.filter((patient) => {
      if (patient.status !== "active") {
        return false;
      }

      return isDoctorMode
        ? patient.doctorId === filterId
        : patient.departmentId === filterId;
    }).length;
  }

  return (
    <section className="flex min-w-0 items-center gap-3">
      <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m12 2 9 5-9 5-9-5 9-5Z" />
          <path d="m3 12 9 5 9-5" />
          <path d="m3 17 9 5 9-5" />
        </svg>

        <span>
          {isDoctorMode ? "Doctors:" : "Departments:"}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-2">
        {visibleFilters.map((filter) => {
          const selected = selectedFilter === filter.id;
          const count = getCount(filter.id);

          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onFilterChange(filter.id)}
              aria-pressed={selected}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                selected
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                  : "border-slate-200 bg-white/80 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              <span>{filter.name}</span>

              {count > 0 && (
                <span
                  className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                    selected
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
