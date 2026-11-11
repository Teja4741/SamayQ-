
"use client";

import type {
  RoomDashboardRoom,
  RoomDashboardPatient,
} from "../types";

import RoomCard from "./RoomCard";

type RoomListProps = {
  rooms: RoomDashboardRoom[];
  selectedRoomId: string;
  assignmentLabel: string;
  callingPatientId: string | null;
  onSelectRoom: (roomId: string) => void;
  onCallPatient: (patient: RoomDashboardPatient) => void;
};

function getWaitingTime(joinedAt: string) {
  const date = new Date(joinedAt).getTime();

  if (!Number.isFinite(date)) return "—";

  const minutes = Math.max(
    0,
    Math.floor((Date.now() - date) / 60000)
  );

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

export default function RoomList({
  rooms,
  selectedRoomId,
  assignmentLabel,
  callingPatientId,
  onSelectRoom,
  onCallPatient,
}: RoomListProps) {
  const selectedRoom = rooms.find(
    (room) => room.id === selectedRoomId
  );

  return (
    <section className="mt-7">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Room Overview</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Select a room to view its patients.
        </p>
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
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                selected={selectedRoomId === room.id}
                assignmentLabel={assignmentLabel}
                onSelect={() => onSelectRoom(room.id)}
              />
            ))}
          </div>

          {selectedRoom && (
            <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col justify-between gap-3 border-b border-gray-100 p-5 dark:border-gray-800 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedRoom.name}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {selectedRoom.roomType.replaceAll("_", " ")}
                    {" · "}
                    {selectedRoom.patients.length} patients
                  </p>
                </div>

                <div className="rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                  {selectedRoom.patients.length} in room
                </div>
              </div>

              {selectedRoom.patients.length === 0 ? (
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
                  <table className="w-full min-w-[720px] text-left text-sm">
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
                      {selectedRoom.patients.map((patient) => (
                        <tr
                          key={patient.queueEntryId}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/40"
                        >
                          <td className="px-5 py-4">
                            <span className="rounded-md bg-violet-50 px-2.5 py-1.5 font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                              {patient.tokenNumber}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-medium">
                              {patient.patientName}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              {patient.phone || "No phone number"}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                            {patient.doctorName !== "—"
                              ? patient.doctorName
                              : patient.departmentName}
                          </td>

                          <td className="px-5 py-4">
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
                              {patient.status === "missed"
                                ? "Missed"
                                : "Waiting"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => onCallPatient(patient)}
                              disabled={
                                callingPatientId === patient.queueEntryId ||
                                patient.status === "missed"
                              }
                              className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {callingPatientId === patient.queueEntryId
                                ? "Calling..."
                                : "Call"}
                            </button>
                          </td>
                        </tr>
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
  );
}
