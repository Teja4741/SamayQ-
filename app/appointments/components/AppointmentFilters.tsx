
"use client";

// Displays appointment search and the new appointment action.

type AppointmentFiltersProps = {
  search: string;
  setSearch: (value: string) => void;
  onAddAppointment: () => void;
};

export default function AppointmentFilters({
  search,
  setSearch,
  onAddAppointment,
}: AppointmentFiltersProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search patient or appointment..."
          className="w-full flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />

        <button
          type="button"
          onClick={onAddAppointment}
          className="whitespace-nowrap rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          + New Appointment
        </button>
      </div>
    </div>
  );
}
