
"use client";

import { useCallback, useEffect, useState } from "react";

import AddDoctorForm from "./components/AddDoctorForm";
import DoctorList from "./components/DoctorList";

import { getDoctors } from "./actions";

import type { Doctor } from "./utils/types";

type DoctorsClientProps = {
  clinicId: string;
  clinicName: string;
};

export default function DoctorsClient({
  clinicId,
  clinicName,
}: DoctorsClientProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch doctors
  const refreshDoctors = useCallback(async () => {
    if (!clinicId) {
      setError("Clinic ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await getDoctors(clinicId);

      if (!result.success) {
        setDoctors([]);
        setError(result.message || "Unable to load doctors.");
        return;
      }

      setDoctors(result.data ?? []);
    } catch (err) {
      console.error("Doctors loading error:", err);
      setError("Something went wrong while loading doctors.");
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  // Initial loading
  useEffect(() => {
    void refreshDoctors();
  }, [refreshDoctors]);

  // Refresh after adding, updating or deleting
  const handleDoctorChanged = useCallback(() => {
    void refreshDoctors();
  }, [refreshDoctors]);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Page Header */}
        <div>
          <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
            {clinicName}
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Doctors
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Manage doctors, consultation settings, availability and appointment schedules.
          </p>
        </div>

        {/* Add Doctor */}
        <section>
          <AddDoctorForm
            clinicId={clinicId}
            onDoctorAdded={handleDoctorChanged}
          />
        </section>

        {/* Doctor List */}
        <section className="space-y-4">

          {loading && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />

              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Loading doctors...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/20">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {error}
              </p>

              <button
                type="button"
                onClick={() => void refreshDoctors()}
                className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && (
            <DoctorList
              clinicId={clinicId}
              doctors={doctors}
              onDoctorUpdated={handleDoctorChanged}
            />
          )}

        </section>
      </div>
    </main>
  );
}
