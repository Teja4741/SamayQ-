
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MoreVertical,
  UserRound,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";

import type {
  BookingMode,
  QueueFilter,
  QueuePatient,
  QueueStatus,
} from "../types/index";

import type { QueueManagementAction } from "../actions";

// This separate action will generate or retrieve the patient's tracking link.
import { getOrCreateQueueTrackingLink } from "../tracking-actions";

import {
  filterByQueueStatus,
  filterQueuePatients,
  formatQueueTime,
} from "../utils/queueHelpers";

type QueuePatientListProps = {
  patients: QueuePatient[];
  bookingMode: BookingMode;
  selectedFilter: string;
  activeStatus: QueueStatus;
  filters: QueueFilter[];
  onAction: (
    queueEntryId: string,
    action: QueueManagementAction
  ) => Promise<void>;
  onTransfer: (patient: QueuePatient) => void;
};

type PatientGroup = {
  id: string;
  name: string;
  patients: QueuePatient[];
};

export default function QueuePatientList({
  patients,
  bookingMode,
  selectedFilter,
  activeStatus,
  filters,
  onAction,
  onTransfer,
}: QueuePatientListProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] =
    useState<"joined" | "token">("joined");

  const [currentTime, setCurrentTime] = useState(0);
  const [pendingPatients, setPendingPatients] =
    useState<string[]>([]);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [trackingPatientId, setTrackingPatientId] =
    useState<string | null>(null);

  const [trackingError, setTrackingError] = useState("");

  useEffect(() => {
    setCurrentTime(Date.now());

    const interval = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  const groups = useMemo<PatientGroup[]>(() => {
    const byFilter = filterQueuePatients(
      patients,
      selectedFilter,
      bookingMode
    );

    const byStatus = filterByQueueStatus(
      byFilter,
      activeStatus
    );

    const query = search.trim().toLowerCase();

    const searched = byStatus.filter((patient) =>
      [
        patient.name,
        patient.phone,
        patient.tokenNumber ?? "",
        patient.roomName ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );

    const sorted = [...searched].sort((a, b) => {
      if (sortBy === "token") {
        return (a.tokenNumber ?? "").localeCompare(
          b.tokenNumber ?? "",
          undefined,
          { numeric: true }
        );
      }

      return (
        new Date(a.joinedAt).getTime() -
        new Date(b.joinedAt).getTime()
      );
    });

    if (selectedFilter !== "all") {
      const selected = filters.find(
        (filter) => filter.id === selectedFilter
      );

      return sorted.length
        ? [
            {
              id: selectedFilter,
              name: selected?.name ?? "Selected queue",
              patients: sorted,
            },
          ]
        : [];
    }

    const grouped = new Map<string, QueuePatient[]>();

    sorted.forEach((patient) => {
      const groupId =
        bookingMode === "doctor"
          ? patient.doctorId ?? "unassigned"
          : patient.departmentId ?? "unassigned";

      const existing = grouped.get(groupId) ?? [];
      existing.push(patient);
      grouped.set(groupId, existing);
    });

    return Array.from(grouped.entries()).map(
      ([id, groupPatients]) => {
        const filter = filters.find(
          (item) => item.id === id
        );

        return {
          id,
          name: filter?.name ?? "Unassigned",
          patients: groupPatients,
        };
      }
    );
  }, [
    patients,
    bookingMode,
    selectedFilter,
    activeStatus,
    search,
    sortBy,
    filters,
  ]);

  const totalPatients = groups.reduce(
    (total, group) => total + group.patients.length,
    0
  );

  const emptyMessages: Record<QueueStatus, string> = {
    active: "No patients are currently waiting in this queue.",
    missed: "There are no missed patients.",
    done: "No completed patients found.",
  };

  function getWaitingTime(joinedAt: string) {
    if (!currentTime) return "--";

    const elapsed = Math.max(
      0,
      Math.floor(
        (currentTime - new Date(joinedAt).getTime()) / 60000
      )
    );

    if (elapsed < 60) return `${elapsed} min`;

    const hours = Math.floor(elapsed / 60);
    const minutes = elapsed % 60;

    return `${hours}h ${minutes}m`;
  }

  async function handleAction(
    patientId: string,
    action: QueueManagementAction
  ) {
    if (pendingPatients.includes(patientId)) return;

    setPendingPatients((current) => [
      ...current,
      patientId,
    ]);

    try {
      await onAction(patientId, action);
    } catch {
      // Parent displays the server action error.
    } finally {
      setPendingPatients((current) =>
        current.filter((id) => id !== patientId)
      );
    }
  }



  async function handleOpenPatientView(patient: QueuePatient) {
    if (trackingPatientId) return;

    // Open a regular new tab in the current browser window synchronously
    // during the user's click, before awaiting the server action.
    const newTab = window.open("about:blank", "_blank");

    if (!newTab) {
      setTrackingError(
        "Your browser blocked the new tab. Please allow pop-ups for this site."
      );
      return;
    }

    // Prevent the new tab from accessing the original Queue page.
    newTab.opener = null;

    setTrackingPatientId(patient.id);
    setTrackingError("");
    setOpenMenuId(null);

    try {
      const result = await getOrCreateQueueTrackingLink(patient.id);

      if (!result.success || !result.trackingUrl) {
        throw new Error(
          result.message || "Unable to generate tracking link."
        );
      }

      // Navigate only the newly opened tab. The Queue page stays open.
      newTab.location.replace(result.trackingUrl);
      newTab.focus();
    } catch (error) {
      console.error("Patient tracking error:", error);

      newTab.close();

      setTrackingError(
        error instanceof Error
          ? error.message
          : "Unable to open patient tracking."
      );
    } finally {
      setTrackingPatientId(null);
    }
  }


  const statusStyles: Record<QueueStatus, string> = {
    active:
      "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    missed:
      "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    done:
      "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  };

  const statusLabels: Record<QueueStatus, string> = {
    active: "Waiting",
    missed: "Missed",
    done: "Completed",
  };

  return (
    <section
      className="space-y-4"
      onClick={(event) => {
        if (
          !(event.target as HTMLElement).closest("[data-patient-menu]")
        ) {
          setOpenMenuId(null);
        }
      }}
    >
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {activeStatus === "active"
                ? "Patients in queue"
                : activeStatus === "missed"
                  ? "Missed patients"
                  : "Completed patients"}
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {totalPatients} patients
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row print:hidden">
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search patient or token..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 sm:w-64 dark:border-gray-700 dark:bg-gray-950"
            />

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value as "token" | "joined"
                )
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-950"
            >
              <option value="joined">Oldest waiting</option>
              <option value="token">Token number</option>
            </select>
          </div>
        </div>
      </div>

      {trackingError && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <span>{trackingError}</span>

          <button
            type="button"
            onClick={() => setTrackingError("")}
            className="font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {groups.length > 0 ? (
        <div className="space-y-5">
          {groups.map((group) => (
            <div
              key={group.id}
              className="overflow-visible rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center justify-between rounded-t-xl border-b border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-950">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {group.name}
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    {bookingMode === "doctor"
                      ? "Doctor queue"
                      : "Department queue"}
                  </p>
                </div>

                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {group.patients.length} patients
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="bg-white text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                    <tr>
                      <th className="px-5 py-4">Token</th>
                      <th className="px-5 py-4">Patient</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">Joined at</th>
                      <th className="px-5 py-4">Waiting</th>
                      <th className="px-5 py-4">Room</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 print:hidden">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {group.patients.map((patient) => {
                      const isPending =
                        pendingPatients.includes(patient.id);

                      const isTracking =
                        trackingPatientId === patient.id;

                      return (
                        <tr
                          key={patient.id}
                          className="transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-lg bg-indigo-50 px-3 py-2 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              {patient.tokenNumber ?? "--"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {patient.name}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {patient.phone}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                patient.type === "appointment"
                                  ? "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              }`}
                            >
                              {patient.type === "appointment"
                                ? "Reserved"
                                : "Walk-in"}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-gray-300">
                            {formatQueueTime(patient.joinedAt)}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-700 dark:text-gray-200">
                            {getWaitingTime(patient.joinedAt)}
                          </td>

                          <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                            {patient.roomName || "Not assigned"}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[patient.status]}`}
                            >
                              {statusLabels[patient.status]}
                            </span>
                          </td>

                          <td className="px-5 py-4 print:hidden">
                            <div className="flex items-center gap-2">
                              {patient.status === "active" && (
                                <>
                                  <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() =>
                                      handleAction(patient.id, "call")
                                    }
                                    className="whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {isPending
                                      ? "Processing..."
                                      : "Call again"}
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => onTransfer(patient)}
                                    className="whitespace-nowrap rounded-lg border border-indigo-300 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950"
                                  >
                                    Next →
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() =>
                                      handleAction(patient.id, "miss")
                                    }
                                    className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-800 dark:text-amber-300"
                                  >
                                    Miss
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() =>
                                      handleAction(patient.id, "complete")
                                    }
                                    className="rounded-lg border border-green-300 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50 dark:border-green-800 dark:text-green-300"
                                  >
                                    Complete
                                  </button>
                                </>
                              )}

                              {patient.status === "missed" && (
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() =>
                                    handleAction(
                                      patient.id,
                                      "return_to_line"
                                    )
                                  }
                                  className="whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                  Return to line
                                </button>
                              )}

                              {/* Three-dot menu for every patient */}
                              <div
                                className="relative"
                                data-patient-menu
                              >
                                <button
                                  type="button"
                                  aria-label={`More actions for ${patient.name}`}
                                  aria-expanded={
                                    openMenuId === patient.id
                                  }
                                  onClick={() =>
                                    setOpenMenuId((current) =>
                                      current === patient.id
                                        ? null
                                        : patient.id
                                    )
                                  }
                                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                  <MoreVertical size={19} />
                                </button>

                                {openMenuId === patient.id && (
                                  <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                                    <button
                                      type="button"
                                      disabled={isTracking}
                                      onClick={() =>
                                        handleOpenPatientView(patient)
                                      }
                                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-200 dark:hover:bg-indigo-950 dark:hover:text-indigo-300"
                                    >
                                      {isTracking ? (
                                        <Loader2
                                          size={17}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <UserRound size={17} />
                                      )}

                                      {isTracking
                                        ? "Opening patient view..."
                                        : "Open Patient View"}

                                      {!isTracking && (
                                        <ExternalLink
                                          size={14}
                                          className="ml-auto"
                                        />
                                      )}
                                    </button>

                                    {patient.status !== "done" && (
                                      <>
                                        <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

                                        <button
                                          type="button"
                                          disabled={isPending}
                                          onClick={() => {
                                            setOpenMenuId(null);

                                            if (
                                              window.confirm(
                                                `Remove ${patient.name} from the queue?`
                                              )
                                            ) {
                                              void handleAction(
                                                patient.id,
                                                "remove"
                                              );
                                            }
                                          }}
                                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950"
                                        >
                                          <Trash2 size={17} />
                                          Remove from queue
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-14 text-center dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl dark:bg-gray-800">
            👥
          </div>

          <h3 className="font-medium text-gray-800 dark:text-gray-200">
            No patients found
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            {search
              ? "Try another search term."
              : emptyMessages[activeStatus]}
          </p>
        </div>
      )}
    </section>
  );
}
