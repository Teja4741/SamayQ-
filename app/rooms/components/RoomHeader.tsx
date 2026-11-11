
"use client";

type RoomHeaderProps = {
  totalRooms: number;
  totalPatients: number;
  totalAssignments: number;
  assignmentLabel: string;
  onRefresh: () => void;
  onAddRoom: () => void;
  refreshing: boolean;
};

export default function RoomHeader({
  totalRooms,
  totalPatients,
  totalAssignments,
  assignmentLabel,
  onRefresh,
  onAddRoom,
  refreshing,
}: RoomHeaderProps) {
  return (
    <>
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
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900"
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>

          <button
            onClick={onAddRoom}
            className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
          >
            + Add Room
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Rooms"
          value={totalRooms}
          description="Active rooms"
          icon="🏥"
        />

        <StatCard
          label="Patients in Rooms"
          value={totalPatients}
          description="Currently assigned to rooms"
          icon="👥"
        />

        <StatCard
          label={assignmentLabel}
          value={totalAssignments}
          description={`Available ${assignmentLabel.toLowerCase()}`}
          icon="▦"
        />
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label}
        </span>
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
