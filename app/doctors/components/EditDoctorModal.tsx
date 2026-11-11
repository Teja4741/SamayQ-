
"use client";

import { useState } from "react";
import type { Doctor } from "./DoctorCard";

type EditDoctorModalProps = {
  doctor: Doctor;
  onClose: () => void;
  onSave: (updatedDoctor: Doctor) => void;
};

export default function EditDoctorModal({
  doctor,
  onClose,
  onSave,
}: EditDoctorModalProps) {
  const [name, setName] = useState(doctor.name);
  const [duration, setDuration] = useState(
    String(doctor.consultationDuration)
  );
  const [patients, setPatients] = useState(
    String(doctor.patientsAtOnce)
  );
  const [price, setPrice] = useState(
    String(doctor.consultationPrice)
  );
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Doctor name is required.");
      return;
    }

    if (!Number.isInteger(Number(duration)) || Number(duration) <= 0) {
      setError("Enter a valid consultation duration.");
      return;
    }

    if (!Number.isInteger(Number(patients)) || Number(patients) <= 0) {
      setError("Patients at once must be at least one.");
      return;
    }

    if (price.trim() === "" || !Number.isFinite(Number(price)) || Number(price) < 0) {
      setError("Enter a valid consultation price.");
      return;
    }

    onSave({
      ...doctor,
      name: name.trim(),
      consultationDuration: Number(duration),
      patientsAtOnce: Number(patients),
      consultationPrice: Number(price),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-doctor-title"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
      >
        <div className="flex items-center justify-between">
          <h2
            id="edit-doctor-title"
            className="text-xl font-semibold text-slate-900 dark:text-white"
          >
            Edit Doctor
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Doctor Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Patients at Once
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={patients}
                onChange={(e) => setPatients(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Consultation Price (₹)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              required
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
