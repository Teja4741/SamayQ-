
"use client";

import { useState } from "react";

const WEEK_DAYS = [
  { label: "Monday", short: "Mon" },
  { label: "Tuesday", short: "Tue" },
  { label: "Wednesday", short: "Wed" },
  { label: "Thursday", short: "Thu" },
  { label: "Friday", short: "Fri" },
  { label: "Saturday", short: "Sat" },
  { label: "Sunday", short: "Sun" },
];

export type DoctorSchedule = {
  workingDays: string[];
  startTime: string;
  endTime: string;
};

type DoctorAvailabilityProps = {
  initialSchedule?: DoctorSchedule;
  onSave: (schedule: DoctorSchedule) => void;
  onCancel?: () => void;
};

export default function DoctorAvailability({
  initialSchedule,
  onSave,
  onCancel,
}: DoctorAvailabilityProps) {
  const [workingDays, setWorkingDays] = useState<string[]>(
    initialSchedule?.workingDays ?? ["Mon", "Tue", "Wed", "Thu", "Fri"]
  );

  const [startTime, setStartTime] = useState(
    initialSchedule?.startTime ?? "09:00"
  );

  const [endTime, setEndTime] = useState(
    initialSchedule?.endTime ?? "17:00"
  );

  const [error, setError] = useState("");

  const toggleDay = (day: string) => {
    setWorkingDays((previous) =>
      previous.includes(day)
        ? previous.filter((item) => item !== day)
        : [...previous, day]
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (workingDays.length === 0) {
      setError("Select at least one working day.");
      return;
    }

    if (startTime >= endTime) {
      setError("End time must be later than start time.");
      return;
    }

    onSave({
      workingDays,
      startTime,
      endTime,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Doctor Availability
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Choose the doctor's working days and consultation hours.
        </p>
      </div>

      <div className="mt-5">
        <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Working Days
        </label>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {WEEK_DAYS.map((day) => {
            const selected = workingDays.includes(day.short);

            return (
              <label
                key={day.short}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition ${
                  selected
                    ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleDay(day.short)}
                  className="h-4 w-4 accent-violet-600"
                />
                {day.label}
              </label>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Start Time
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            End Time
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            required
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Save Availability
        </button>
      </div>
    </form>
  );
}
