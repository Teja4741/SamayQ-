
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getPublicAppointmentTracking,
  type TrackingData,
} from "./actions";

type Props = {
  token: string;
};

function formatDate(date: string | null | undefined): string {
  if (!date) return "Not applicable";

  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(time: string | null | undefined): string {
  if (!time) return "Not applicable";

  const [hours, minutes] = time.split(":");

  if (hours === undefined || minutes === undefined) {
    return "Not available";
  }

  const date = new Date();

  date.setHours(Number(hours), Number(minutes), 0, 0);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function TrackingClient({ token }: Props) {
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTracking = useCallback(async () => {
    try {
      const result = await getPublicAppointmentTracking(token);

      if (!result.success) {
        setError(result.message || "Unable to load tracking details.");
        setLoading(false);
        return;
      }

      setError("");
      setData(result);
      setLoading(false);
    } catch (err) {
      console.error("Patient tracking error:", err);
      setError("Unable to load tracking details. Please try again.");
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadTracking();

    const interval = window.setInterval(() => {
      void loadTracking();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [loadTracking]);

  if (loading && !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-600">Loading your queue details...</p>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            Tracking unavailable
          </h1>

          <p className="mt-2 text-sm text-gray-600">{error}</p>

          <button
            onClick={() => {
              setLoading(true);
              void loadTracking();
            }}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-white"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!data?.clinic || !data.booking || !data.queue) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            Tracking unavailable
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            We couldn't find your queue details.
          </p>
        </div>
      </main>
    );
  }

  const { clinic, booking, queue } = data;

  const isActive = queue.status === "active";
  const isCompleted =
    queue.status === "completed" || queue.status === "done";
  const isMissed = queue.status === "missed";
  const isPending = queue.status === "queue_pending";

  const isWalkIn = booking.visit_type === "walk_in";

  let statusLabel = "Waiting in queue";
  let statusStyle = "bg-blue-100 text-blue-700";

  if (isPending) {
    statusLabel = "Queue activation pending";
    statusStyle = "bg-amber-100 text-amber-700";
  } else if (isCompleted) {
    statusLabel = "Consultation completed";
    statusStyle = "bg-green-100 text-green-700";
  } else if (isMissed) {
    statusLabel = "Marked as missed";
    statusStyle = "bg-red-100 text-red-700";
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-xl space-y-5">

        {/* Clinic information */}
        <header className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-blue-600">
            Patient queue tracking
          </p>

          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {clinic.name}
          </h1>

          {clinic.address && (
            <p className="mt-1 text-sm text-gray-500">
              {clinic.address}
            </p>
          )}

          {/* Patient details */}
          {booking.patient_name && (
            <div className="mt-4 border-t pt-4">
              <p className="text-sm text-gray-500">Patient name</p>
              <p className="mt-1 font-semibold text-gray-900">
                {booking.patient_name}
              </p>
            </div>
          )}

          {/* Doctor or department */}
          <div className="mt-5 border-t pt-4">
            <p className="text-sm text-gray-500">
              {booking.type === "doctor" ? "Doctor" : "Department"}
            </p>

            <h2 className="mt-1 text-lg font-semibold text-gray-900">
              {booking.type === "doctor"
                ? booking.doctor_name || "Doctor"
                : booking.department_name || "Department"}
            </h2>

            {booking.type === "doctor" && booking.specialization && (
              <p className="text-sm text-gray-500">
                {booking.specialization}
              </p>
            )}
          </div>

          {/* Appointment information: only for appointments */}
          {!isWalkIn && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Appointment date</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {formatDate(booking.appointment_date)}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Appointment time</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {formatTime(booking.appointment_time)}
                </p>
              </div>
            </div>
          )}

          {isWalkIn && (
            <div className="mt-5 rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Visit type</p>
              <p className="mt-1 font-semibold text-gray-900">
                Walk-in patient
              </p>
            </div>
          )}
        </header>

        {/* Queue information */}
        <section className="rounded-2xl border bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Your queue token
          </p>

          {queue.token_label ? (
            <p className="mt-2 text-5xl font-bold tracking-tight text-blue-600">
              {queue.token_label}
            </p>
          ) : (
            <p className="mt-3 text-xl font-semibold text-gray-400">
              Not assigned yet
            </p>
          )}

          <span
            className={`mt-4 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${statusStyle}`}
          >
            {statusLabel}
          </span>

          {isPending && (
            <p className="mt-4 text-sm text-gray-600">
              Your appointment is confirmed. Your queue token will appear
              automatically when the hospital activates your queue.
            </p>
          )}

          {isActive && (
            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-sm text-gray-600">Patients ahead</p>
                <p className="mt-1 text-3xl font-bold text-blue-700">
                  {queue.patients_ahead ?? "—"}
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-sm text-gray-600">Queue position</p>
                <p className="mt-1 text-3xl font-bold text-blue-700">
                  {queue.queue_position ?? "—"}
                </p>
              </div>
            </div>
          )}

          {isCompleted && (
            <p className="mt-4 text-sm text-green-700">
              Your queue entry has been completed.
            </p>
          )}

          {isMissed && (
            <p className="mt-4 text-sm text-red-700">
              Your queue entry has been marked as missed. Please contact
              the hospital for assistance.
            </p>
          )}
        </section>

        {/* Refresh information */}
        <footer className="rounded-xl border bg-white p-4 text-center">
          <p className="text-xs text-gray-500">
            Queue information refreshes automatically every 10 seconds.
          </p>

          {error && (
            <p className="mt-2 text-xs text-amber-700">
              Unable to refresh the latest information. Showing the last
              available update.
            </p>
          )}

          <button
            onClick={() => {
              setLoading(true);
              void loadTracking();
            }}
            className="mt-2 text-sm font-semibold text-blue-600"
          >
            Refresh now
          </button>
        </footer>

      </div>
    </main>
  );
}
