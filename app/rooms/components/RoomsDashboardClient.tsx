
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  callRoomPatient,
  createClinicRoom,
  transferRoomPatient,
} from "../actions";
import { manageQueueEntry } from "@/app/queues/actions";

import type {
  RoomDashboardData,
  RoomDashboardPatient,
  CreateRoomInput,
} from "../types/index";

import AddRoomForm from "./AddRoomForm";

type RoomsDashboardClientProps = {
  clinicId: string;
  initialData: RoomDashboardData;
};

function getWaitingTime(joinedAt: string) {
  const timestamp = new Date(joinedAt).getTime();

  if (!Number.isFinite(timestamp)) return "—";

  const minutes = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 60000)
  );

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
}

export default function RoomsDashboardClient({
  clinicId,
  initialData,
}: RoomsDashboardClientProps) {
  const router = useRouter();

  const [selectedRoomId, setSelectedRoomId] = useState(
    initialData.rooms[0]?.id ?? ""
  );

  const [selectedAssignment, setSelectedAssignment] =
    useState("all");

  const [search, setSearch] = useState("");
  const [showAddRoom, setShowAddRoom] = useState(false);

  const [isPending, startTransition] = useTransition();

  const [callingPatientId, setCallingPatientId] = useState<
    string | null
  >(null);

  const [transferPatient, setTransferPatient] =
    useState<RoomDashboardPatient | null>(null);
  const [destinationRoomId, setDestinationRoomId] = useState("");
  const [transferringPatientId, setTransferringPatientId] =
    useState<string | null>(null);
  const [finishingPatientId, setFinishingPatientId] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isDoctorMode = initialData.bookingMode === "doctor";

  const assignmentLabel = isDoctorMode ? "Doctor" : "Department";

  const assignmentOptions = isDoctorMode
    ? initialData.doctors.map((doctor) => ({
        id: doctor.id,
        name: doctor.name,
      }))
    : initialData.departments.map((department) => ({
        id: department.id,
        name: department.name,
      }));

  const rooms = initialData.rooms;

  // Filter patients by doctor or department and search text.
  const filteredRooms = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return rooms.map((room) => {
      const patients = room.patients.filter((patient) => {
        const matchesAssignment =
          selectedAssignment === "all" ||
          (isDoctorMode
            ? patient.doctorAssignmentId === selectedAssignment
            : patient.departmentId === selectedAssignment);

        const matchesSearch =
          !searchText ||
          patient.patientName.toLowerCase().includes(searchText) ||
          patient.tokenNumber.toLowerCase().includes(searchText);

        return matchesAssignment && matchesSearch;
      });

      return {
        ...room,
        patients,
      };
    });
  }, [rooms, selectedAssignment, search, isDoctorMode]);

  const visibleSelectedRoom = filteredRooms.find(
    (room) => room.id === selectedRoomId
  );

  const filteredPatientCount = filteredRooms.reduce(
    (total, room) => total + room.patients.length,
    0
  );

  // Keep room tabs visible even when a room has no matching patients.
  const selectedRoom = rooms.find(
    (room) => room.id === selectedRoomId
  );

  async function handleAddRoom(input: CreateRoomInput) {
    setErrorMessage("");
    setSuccessMessage("");

    // Server action validates clinic access and assignment.
    const result = await createClinicRoom(input);

    setShowAddRoom(false);
    setSelectedRoomId(result.roomId);
    setSuccessMessage("Room created successfully.");

    startTransition(() => {
      router.refresh();
    });
  }

  async function handleCall(patient: RoomDashboardPatient) {
    setErrorMessage("");
    setSuccessMessage("");
    setCallingPatientId(patient.queueEntryId);

    try {
      await callRoomPatient(patient.queueEntryId);

      setSuccessMessage(
        `${patient.tokenNumber} - ${patient.patientName} called successfully.`
      );

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to call patient."
      );
    } finally {
      setCallingPatientId(null);
    }
  }

  async function handleFinish(patient: RoomDashboardPatient) {
    setErrorMessage("");
    setSuccessMessage("");
    setFinishingPatientId(patient.queueEntryId);

    try {
      await manageQueueEntry(patient.queueEntryId, "complete");

      setSuccessMessage(
        `${patient.tokenNumber} - ${patient.patientName} marked as completed.`
      );

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to finish this patient."
      );
    } finally {
      setFinishingPatientId(null);
    }
  }

  async function handleTransfer() {
    if (!transferPatient || !destinationRoomId) {
      setErrorMessage("Please select a destination room.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setTransferringPatientId(transferPatient.queueEntryId);

    try {
      const result = await transferRoomPatient(
        transferPatient.queueEntryId,
        destinationRoomId
      );

      setSuccessMessage(
        `${transferPatient.tokenNumber} - ${transferPatient.patientName} transferred to ${result.destination_room_name}.`
      );

      setTransferPatient(null);
      setDestinationRoomId("");

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to transfer patient."
      );
    } finally {
      setTransferringPatientId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-200">
              Rooms
            </span>
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Rooms Dashboard
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor patients and manage room queues.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.refresh()}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900"
          >
            <span>↻</span>
            {isPending ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={() => {
              setErrorMessage("");
              setSuccessMessage("");
              setShowAddRoom(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            <span>+</span>
            Add Room
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Rooms"
          value={initialData.totalRooms}
          icon="🏥"
          description="Active rooms"
        />

        <StatCard
          label="Patients in Rooms"
          value={initialData.totalPatients}
          icon="👥"
          description="Currently assigned to rooms"
        />

        <StatCard
          label={isDoctorMode ? "Doctors" : "Departments"}
          value={
            isDoctorMode
              ? initialData.doctors.length
              : initialData.departments.length
          }
          icon="▦"
          description={`Available ${assignmentLabel.toLowerCase()}s`}
        />
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
          {successMessage}
        </div>
      )}

      {/* Doctor or Department filters */}
      <section className="mt-7 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-semibold">
              {isDoctorMode ? "Doctors" : "Departments"}
            </h2>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Filter patients by {assignmentLabel.toLowerCase()}.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={selectedAssignment === "all"}
              onClick={() => setSelectedAssignment("all")}
            >
              All {isDoctorMode ? "Doctors" : "Departments"}
            </FilterButton>

            {assignmentOptions.map((option) => (
              <FilterButton
                key={option.id}
                active={selectedAssignment === option.id}
                onClick={() => setSelectedAssignment(option.id)}
              >
                {option.name}
              </FilterButton>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="mt-5">
          <label
            htmlFor="room-patient-search"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Search patients
          </label>

          <div className="relative max-w-xl">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              ⌕
            </span>

            <input
              id="room-patient-search"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by patient name or token number..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-gray-700 dark:bg-gray-950 dark:focus:ring-violet-950"
            />
          </div>
        </div>
      </section>

      {/* Room tabs */}
      <section className="mt-7">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-semibold">Room Overview</h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Select a room to view its patients.
            </p>
          </div>

          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredPatientCount} patients matching filters
          </span>
        </div>

        {rooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
            <div className="text-3xl">🏥</div>

            <h3 className="mt-3 font-semibold">No active rooms</h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Add a room to start managing patients.
            </p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {filteredRooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`min-w-[105px] rounded-xl border px-4 py-3 text-left transition ${
                    selectedRoomId === room.id
                      ? "border-violet-600 bg-violet-600 text-white shadow-sm"
                      : "border-gray-200 bg-white text-gray-700 hover:border-violet-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                  }`}
                >
                  <div className="font-semibold">{room.name}</div>

                  <div
                    className={`mt-1 text-xs ${
                      selectedRoomId === room.id
                        ? "text-violet-100"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {room.patients.length} patients
                  </div>
                </button>
              ))}
            </div>

            {/* Selected room */}
            {selectedRoom && visibleSelectedRoom && (
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col justify-between gap-3 border-b border-gray-100 p-5 dark:border-gray-800 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {selectedRoom.name}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {selectedRoom.roomType.replaceAll("_", " ")}
                      {" · "}
                      {visibleSelectedRoom.patients.length} patients
                    </p>
                  </div>

                  <div className="rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                    {visibleSelectedRoom.patients.length} in room queue
                  </div>
                </div>

                {visibleSelectedRoom.patients.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="text-3xl">🪑</div>

                    <h4 className="mt-3 font-semibold">
                      No patients in this room
                    </h4>

                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Patients assigned to this room will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-950/60 dark:text-gray-400">
                        <tr>
                          <th className="px-5 py-4">Token</th>
                          <th className="px-5 py-4">Patient</th>
                          <th className="px-5 py-4">{assignmentLabel}</th>
                          <th className="px-5 py-4">Waiting</th>
                          <th className="px-5 py-4">Status</th>
                          <th className="px-5 py-4 text-right">Action</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {visibleSelectedRoom.patients.map((patient) => (
                          <PatientRow
                            key={patient.queueEntryId}
                            patient={patient}
                            isDoctorMode={isDoctorMode}
                            loading={
                              callingPatientId === patient.queueEntryId
                            }
                            transferring={
                              transferringPatientId === patient.queueEntryId
                            }
                            finishing={
                              finishingPatientId === patient.queueEntryId
                            }
                            onCall={() => handleCall(patient)}
                            onFinish={() => handleFinish(patient)}
                            onNext={() => {
                              setErrorMessage("");
                              setSuccessMessage("");
                              setTransferPatient(patient);
                              setDestinationRoomId("");
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* Patient transfer modal */}
      {transferPatient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !transferringPatientId) {
              setTransferPatient(null);
              setDestinationRoomId("");
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="transfer-dialog-title"
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="transfer-dialog-title" className="text-lg font-bold">
                  Transfer Patient
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Select an active destination room.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTransferPatient(null);
                  setDestinationRoomId("");
                }}
                disabled={transferringPatientId !== null}
                aria-label="Close transfer dialog"
                className="rounded-lg px-2 py-1 text-xl text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
              >
                ×
              </button>
            </div>

            <div className="mt-5 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p className="font-semibold">{transferPatient.patientName}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Token: {transferPatient.tokenNumber}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Current room:{" "}
                {rooms.find((room) => room.id === transferPatient.roomId)?.name ?? "Unknown"}
              </p>
            </div>

            <div className="mt-5">
              <label
                htmlFor="destination-room"
                className="mb-2 block text-sm font-medium"
              >
                Destination Room
              </label>
              <select
                id="destination-room"
                value={destinationRoomId}
                onChange={(event) => setDestinationRoomId(event.target.value)}
                disabled={transferringPatientId !== null}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:focus:ring-violet-950"
              >
                <option value="">Choose a room</option>
                {rooms
                  .filter((room) => room.id !== transferPatient.roomId)
                  .map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
              </select>

              {rooms.filter(
                (room) => room.id !== transferPatient.roomId
              ).length === 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  No other active rooms are available in this hospital.
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setTransferPatient(null);
                  setDestinationRoomId("");
                }}
                disabled={transferringPatientId !== null}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTransfer}
                disabled={!destinationRoomId || transferringPatientId !== null}
                className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {transferringPatientId ? "Transferring..." : "Confirm Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Room modal */}
      {showAddRoom && (
        <AddRoomForm
          clinicId={clinicId}
          bookingMode={initialData.bookingMode}
          options={assignmentOptions}
          onSubmit={handleAddRoom}
          onCancel={() => setShowAddRoom(false)}
        />
      )}
    </div>
  );
}

// --------------------------------------------------
// STATISTICS CARD
// --------------------------------------------------

function StatCard({
  label,
  value,
  icon,
  description,
}: {
  label: string;
  value: number;
  icon: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label}
        </div>

        <span className="text-xl">{icon}</span>
      </div>

      <div className="mt-3 text-3xl font-bold tabular-nums">
        {value}
      </div>

      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}

// --------------------------------------------------
// FILTER BUTTON
// --------------------------------------------------

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition ${
        active
          ? "border-violet-600 bg-violet-600 text-white"
          : "border-gray-200 bg-white text-gray-600 hover:border-violet-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

// --------------------------------------------------
// PATIENT ROW
// --------------------------------------------------

function PatientRow({
  patient,
  isDoctorMode,
  loading,
  transferring,
  finishing,
  onCall,
  onNext,
  onFinish,
}: {
  patient: RoomDashboardPatient;
  isDoctorMode: boolean;
  loading: boolean;
  transferring: boolean;
  finishing: boolean;
  onCall: () => void;
  onNext: () => void;
  onFinish: () => void;
}) {
  return (
    <tr className="transition hover:bg-gray-50 dark:hover:bg-gray-800/40">
      <td className="px-5 py-4">
        <span className="rounded-md bg-violet-50 px-2.5 py-1.5 font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
          {patient.tokenNumber}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="font-medium text-gray-900 dark:text-white">
          {patient.patientName}
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {patient.phone || "No phone number"}
        </div>
      </td>
      <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
        {isDoctorMode ? patient.doctorName : patient.departmentName}
      </td>
      <td className="px-5 py-4 font-medium text-gray-700 dark:text-gray-300">
        {getWaitingTime(patient.joinedAt)}
      </td>
      <td className="px-5 py-4">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            patient.status === "missed"
              ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
              : "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
          }`}
        >
          {patient.status === "missed" ? "Missed" : "Waiting"}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCall}
            disabled={
              loading || transferring || finishing || patient.status === "missed"
            }
            className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Calling..." : "Call"}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={
              loading || transferring || finishing || patient.status === "missed"
            }
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-green-500 hover:bg-green-50 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-green-950/30"
          >
            {transferring ? "Moving..." : "Next →"}
          </button>
          <button
            type="button"
            onClick={onFinish}
            disabled={loading || transferring || finishing}
            className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {finishing ? "Finishing..." : "Finish ✓"}
          </button>
        </div>
      </td>
    </tr>
  );
}
