
"use client";

import { useEffect, useMemo, useState } from "react";
import { getPatients, type PatientRow } from "./actions";

type Props = {
  clinicId: string;
  clinicName: string;
};

const PAGE_SIZE = 10;

function formatDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDateKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateFilter(value: string) {
  const match = value.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (!match) return null;

  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

export default function PatientsClient({
  clinicId,
  clinicName,
}: Props) {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function loadPatients() {
      setLoading(true);
      setError("");

      const result = await getPatients(clinicId);

      if (cancelled) return;

      if (!result.success) {
        setError(result.error ?? "Unable to load patients.");
        setPatients([]);
      } else {
        setPatients(result.patients);
      }

      setLoading(false);
    }

    void loadPatients();

    return () => {
      cancelled = true;
    };
  }, [clinicId]);

  const filteredPatients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const selectedDate = dateFilter.trim()
      ? parseDateFilter(dateFilter)
      : null;

    return patients.filter((patient) => {
      const matchesSearch =
        !normalizedSearch ||
        patient.name.toLowerCase().includes(normalizedSearch) ||
        patient.phone.toLowerCase().includes(normalizedSearch);

      const matchesDate =
        !dateFilter.trim() ||
        (selectedDate !== null &&
          patient.lastSeen !== null &&
          getDateKey(patient.lastSeen) === selectedDate);

      return matchesSearch && matchesDate;
    });
  }, [patients, search, dateFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPatients.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [search, dateFilter]);

  const totalVisits = patients.reduce(
    (total, patient) => total + patient.visits,
    0
  );

  const totalNoShows = patients.reduce(
    (total, patient) => total + patient.noShows,
    0
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8">
      {/* Page heading */}
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-violet-600">
            {clinicName}
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Patients
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            View and manage your clinic's patient records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSearch("");
            setDateFilter("");
            setPage(1);
          }}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Clear filters
        </button>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total patients"
          value={patients.length}
          description="Registered in this clinic"
        />

        <SummaryCard
          label="Total visits"
          value={totalVisits}
          description="Recorded patient visits"
        />

        <SummaryCard
          label="No-shows"
          value={totalNoShows}
          description="Recorded no-show events"
        />
      </div>

      {/* Main table container */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">All patients</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {filteredPatients.length} patient
              {filteredPatients.length === 1 ? "" : "s"} found
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m16 16 4 4" />
              </svg>

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search patient name or phone"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 sm:w-64 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-violet-950"
              />
            </div>

            <input
              type="text"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              placeholder="Date: dd-mm-yyyy"
              aria-label="Filter by last seen date"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 sm:w-44 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-violet-950"
            />
          </div>
        </div>

        {/* Invalid date message */}
        {dateFilter.trim() && !parseDateFilter(dateFilter) && (
          <p className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            Enter the date in dd-mm-yyyy format, for example 04-11-2026.
          </p>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
              Loading patients...
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="font-medium text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 text-sm font-medium text-violet-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : paginatedPatients.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-600 dark:bg-violet-950">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <circle cx="9" cy="8" r="3.5" />
                <path d="M2.5 20v-1.5a6.5 6.5 0 0 1 13 0V20M17 11a3 3 0 1 0 0-6M18 14a5 5 0 0 1 3.5 4.8V20" />
              </svg>
            </div>

            <h3 className="font-semibold">No patients found</h3>

            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              {patients.length === 0
                ? "Patients will appear here when they are registered or added through your clinic's appointment and queue workflows."
                : "Try changing your search or date filter."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Patient</th>
                    <th className="px-4 py-4">Type</th>
                    <th className="px-4 py-4">Room</th>
                    <th className="px-4 py-4">Visits</th>
                    <th className="px-4 py-4">No-shows</th>
                    <th className="px-5 py-4">Last seen</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedPatients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                            {patient.name.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 dark:text-slate-100">
                              {patient.name}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {patient.phone}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            patient.type === "Mixed"
                              ? "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                              : patient.type === "Reserved"
                                ? "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {patient.type}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                        {patient.rooms.length > 0
                          ? patient.rooms.join(", ")
                          : "-"}
                      </td>

                      <td className="px-4 py-4 font-medium tabular-nums">
                        {patient.visits}
                      </td>

                      <td className="px-4 py-4">
                        {patient.noShows > 0 ? (
                          <span className="font-medium text-red-600 dark:text-red-400">
                            {patient.noShows}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {formatDate(patient.lastSeen)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile patient cards */}
            <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {paginatedPatients.map((patient) => (
                <article key={patient.id} className="space-y-3 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                      {patient.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {patient.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {patient.phone}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-slate-800">
                      {patient.type}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Room</p>
                      <p className="mt-1">
                        {patient.rooms.join(", ") || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Visits</p>
                      <p className="mt-1 font-medium">{patient.visits}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">No-shows</p>
                      <p className="mt-1 font-medium">
                        {patient.noShows || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Last seen</p>
                      <p className="mt-1">{formatDate(patient.lastSeen)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {!loading && !error && filteredPatients.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing{" "}
              {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(
                currentPage * PAGE_SIZE,
                filteredPatients.length
              )}{" "}
              of {filteredPatients.length} patients
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Previous
              </button>

              <span className="px-2 text-sm text-slate-600 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
        {value.toLocaleString("en-IN")}
      </p>

      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}
