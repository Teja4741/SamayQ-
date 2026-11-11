
"use client";

import type { ReactNode } from "react";

export type Doctor = {
  id: number;
  name: string;
  consultationDuration: number;
  patientsAtOnce: number;
  consultationPrice: number;
  workingDays: string[];
  startTime: string;
  endTime: string;
  isOnScreen: boolean;
  availability: "Available" | "Away";
};

type DoctorCardProps = {
  doctor: Doctor;
  onEdit: (doctor: Doctor) => void;
  onDelete: (id: number) => void;
  onAvailabilityChange: (id: number) => void;
  onScreenChange: (id: number) => void;
};

export default function DoctorCard({
  doctor,
  onEdit,
  onDelete,
  onAvailabilityChange,
  onScreenChange,
}: DoctorCardProps) {
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to remove ${doctor.name}?`)) {
      onDelete(doctor.id);
    }
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      {/* Doctor Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {doctor.name}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Consultation Fee: ₹{doctor.consultationPrice}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            doctor.availability === "Available"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          }`}
        >
          {doctor.availability}
        </span>
      </div>

      {/* Consultation Details */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Detail label="Consultation Duration">
          {doctor.consultationDuration} minutes
        </Detail>

        <Detail label="Patients at Once">
          {doctor.patientsAtOnce}
        </Detail>
      </div>

      {/* Working Schedule */}
      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Working Days
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          {doctor.workingDays.map((day) => (
            <span
              key={day}
              className="rounded-md bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
            >
              {day}
            </span>
          ))}
        </div>

        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          {doctor.startTime} – {doctor.endTime}
        </p>
      </div>

      {/* Screen Status */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Patient Display
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {doctor.isOnScreen ? "Visible on screen" : "Hidden from screen"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onScreenChange(doctor.id)}
          className={`rounded-lg px-3 py-2 text-xs font-semibold ${
            doctor.isOnScreen
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {doctor.isOnScreen ? "On-screen" : "Off-screen"}
        </button>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => onAvailabilityChange(doctor.id)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Change Status
        </button>

        <button
          type="button"
          onClick={() => onEdit(doctor)}
          className="rounded-lg border border-violet-200 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 dark:border-violet-900 dark:text-violet-400 dark:hover:bg-violet-900/20"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={handleDelete}
          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-900 dark:text-white">
        {children}
      </p>
    </div>
  );
}
