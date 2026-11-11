
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getClinicQueueData,
  manageQueueEntry,
  registerWalkInPatient,
} from "./actions";

import type { QueueManagementAction } from "./actions";

import type {
  QueueFormOptions,
  QueuePatient,
  QueueStatus,
} from "./types/index";

import { transferRoomPatient } from "@/app/rooms/actions";

import Navbar from "@/app/components/Navbar";
import QueueHeader from "./components/QueueHeader";
import AddPatientForm from "./components/AddPatientForm";
import QueueFilters from "./components/QueueFilterTabs";
import QueueStatusTabs from "./components/QueueStatusTabs";
import QueuePatientList from "./components/QueuePatientList";

type QueueData = Awaited<ReturnType<typeof getClinicQueueData>>;

export type NavbarRole =
  | "master_admin"
  | "clinic_admin"
  | "receptionist"
  | "doctor";

type TransferRoom = {
  id: string;
  name: string;
};

type QueuePageClientProps = {
  clinic: {
    id: string;
    name: string;
    address: string | null;
  };
  queueData: QueueData;
  formOptions: QueueFormOptions;
  email?: string;
  role: NavbarRole;
};

export default function QueuePageClient({
  clinic,
  queueData,
  formOptions,
  email,
  role,
}: QueuePageClientProps) {
  const router = useRouter();

  const [selectedFilter, setSelectedFilter] = useState("all");
  const [activeStatus, setActiveStatus] =
    useState<QueueStatus>("active");

  const [actionError, setActionError] = useState("");

  // Patient transfer state
  const [transferPatient, setTransferPatient] =
    useState<QueuePatient | null>(null);

  const [transferRooms, setTransferRooms] =
    useState<TransferRoom[]>([]);

  const [selectedRoomId, setSelectedRoomId] = useState("");

  const [loadingRooms, setLoadingRooms] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState("");

  const queuePatients = Array.isArray(queueData?.patients)
    ? queueData.patients
    : [];

  const queueFilters = Array.isArray(queueData?.filters)
    ? queueData.filters
    : [];

  const bookingMode = queueData?.bookingMode ?? "department";

  const filteredPatients = useMemo(() => {
    if (selectedFilter === "all") {
      return queuePatients;
    }

    return queuePatients.filter((patient) =>
      bookingMode === "doctor"
        ? patient.doctorId === selectedFilter
        : patient.departmentId === selectedFilter
    );
  }, [queuePatients, bookingMode, selectedFilter]);

  const filteredStats = useMemo(
    () => ({
      active: filteredPatients.filter(
        (patient) => patient.status === "active"
      ).length,

      missed: filteredPatients.filter(
        (patient) => patient.status === "missed"
      ).length,

      done: filteredPatients.filter(
        (patient) => patient.status === "done"
      ).length,
    }),
    [filteredPatients]
  );

  async function handleAddPatient(data: {
    patientId: string | null;
    patientName: string;
    phone: string;
    entryType: "walk_in" | "appointment";
    appointmentId: string | null;
    doctorAssignmentId: string | null;
    departmentId: string | null;
  }) {
    try {
      const { createClient } = await import(
        "@/lib/supabase/client"
      );

      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(authError.message);
      }

      if (!user) {
        throw new Error(
          "User is not logged in. Please sign in again."
        );
      }

      if (data.entryType === "appointment") {
        throw new Error(
          "Reserved appointment registration is not connected yet."
        );
      }

      await registerWalkInPatient({
        clinicId: clinic.id,
        patientId: data.patientId,
        patientName: data.patientName,
        phone: data.phone,
        doctorAssignmentId: data.doctorAssignmentId,
        departmentId: data.departmentId,
      });

      router.refresh();
    } catch (error) {
      console.error("Add patient error:", error);
      throw error;
    }
  }

  async function handleQueueAction(
    queueEntryId: string,
    action: QueueManagementAction
  ) {
    setActionError("");

    try {
      await manageQueueEntry(queueEntryId, action);
      router.refresh();
    } catch (error) {
      console.error("Queue action failed:", error);

      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to perform this queue action."
      );

      throw error;
    }
  }

  // Open the transfer dialog and load active rooms
  async function handleOpenTransfer(patient: QueuePatient) {
    setTransferPatient(patient);
    setSelectedRoomId("");
    setTransferError("");
    setTransferRooms([]);
    setLoadingRooms(true);

    try {
      const { createClient } = await import(
        "@/lib/supabase/client"
      );

      const supabase = createClient();

      const {
        data: rooms,
        error,
      } = await supabase
        .from("rooms")
        .select("id, name")
        .eq("clinic_id", clinic.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      // Do not show the patient's current room as a destination.
      const availableRooms = (rooms ?? []).filter(
        (room) => room.name !== patient.roomName
      );

      setTransferRooms(availableRooms);

      if (availableRooms.length === 0) {
        setTransferError(
          "No other active rooms are available in this clinic."
        );
      }
    } catch (error) {
      console.error("Loading rooms failed:", error);

      setTransferError(
        error instanceof Error
          ? error.message
          : "Unable to load active rooms."
      );
    } finally {
      setLoadingRooms(false);
    }
  }

  function handleCloseTransfer() {
    if (transferring) return;

    setTransferPatient(null);
    setSelectedRoomId("");
    setTransferError("");
    setTransferRooms([]);
  }

  // Confirm transfer
  async function handleConfirmTransfer() {
    if (!transferPatient) {
      setTransferError("Please select a patient.");
      return;
    }

    if (!selectedRoomId) {
      setTransferError("Please select a destination room.");
      return;
    }

    setTransferring(true);
    setTransferError("");

    try {
      await transferRoomPatient(
        transferPatient.id,
        selectedRoomId
      );

      setTransferPatient(null);
      setSelectedRoomId("");
      setTransferRooms([]);

      router.refresh();
    } catch (error) {
      console.error("Patient transfer failed:", error);

      setTransferError(
        error instanceof Error
          ? error.message
          : "Unable to transfer this patient."
      );
    } finally {
      setTransferring(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar
        email={email}
        displayName={clinic.name}
        role={role}
      />

      <main className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-10">
        <QueueHeader clinicName={clinic.name} />

        <AddPatientForm
          bookingMode={bookingMode}
          doctors={formOptions.doctors ?? []}
          departments={formOptions.departments ?? []}
          returningPatients={[]}
          availableAppointments={[]}
          onSubmit={handleAddPatient}
        />

        <QueueFilters
          bookingMode={bookingMode}
          filters={queueFilters}
          patients={queuePatients}
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
        />

        <QueueStatusTabs
          activeStatus={activeStatus}
          counts={filteredStats}
          onStatusChange={setActiveStatus}
        />

        {actionError && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            <span>{actionError}</span>

            <button
              type="button"
              onClick={() => setActionError("")}
              className="font-semibold"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        <QueuePatientList
          patients={queuePatients}
          bookingMode={bookingMode}
          selectedFilter={selectedFilter}
          activeStatus={activeStatus}
          filters={queueFilters}
          onAction={handleQueueAction}
          onTransfer={handleOpenTransfer}
        />
      </main>

      {/* Patient transfer dialog */}
      {transferPatient && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseTransfer();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="transfer-dialog-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2
                  id="transfer-dialog-title"
                  className="text-lg font-bold text-slate-900 dark:text-white"
                >
                  Transfer Patient
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Move this patient to another room.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseTransfer}
                disabled={transferring}
                className="rounded-lg px-2 py-1 text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
                aria-label="Close transfer dialog"
              >
                ×
              </button>
            </div>

            <div className="mb-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="font-semibold text-slate-900 dark:text-white">
                {transferPatient.name}
              </p>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Token: {transferPatient.tokenNumber ?? "--"}
              </p>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Current room: {transferPatient.roomName || "Not assigned"}
              </p>
            </div>

            <label
              htmlFor="destination-room"
              className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Destination Room
            </label>

            {loadingRooms ? (
              <div className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-700">
                Loading active rooms...
              </div>
            ) : (
              <select
                id="destination-room"
                value={selectedRoomId}
                onChange={(event) =>
                  setSelectedRoomId(event.target.value)
                }
                disabled={transferring || transferRooms.length === 0}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">Select a room</option>

                {transferRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            )}

            {transferError && (
              <p
                role="alert"
                className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
              >
                {transferError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseTransfer}
                disabled={transferring}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={
                  transferring ||
                  loadingRooms ||
                  !selectedRoomId
                }
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {transferring ? "Transferring..." : "Confirm Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
