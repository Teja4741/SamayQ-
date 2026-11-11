
"use client";

import type { RoomDashboardRoom } from "../types";

type RoomCardProps = {
  room: RoomDashboardRoom;
  selected: boolean;
  assignmentLabel: string;
  onSelect: () => void;
};

export default function RoomCard({
  room,
  selected,
  assignmentLabel,
  onSelect,
}: RoomCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-w-[115px] rounded-xl border px-4 py-3 text-left transition ${
        selected
          ? "border-violet-600 bg-violet-600 text-white shadow-sm"
          : "border-gray-200 bg-white text-gray-700 hover:border-violet-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
      }`}
    >
      <div className="font-semibold">{room.name}</div>

      <div
        className={`mt-1 text-xs ${
          selected
            ? "text-violet-100"
            : "text-gray-500 dark:text-gray-400"
        }`}
      >
        {room.patients.length} patients
      </div>

      <div
        className={`mt-2 truncate text-[11px] ${
          selected
            ? "text-violet-100"
            : "text-gray-400 dark:text-gray-500"
        }`}
      >
        {room.doctorName ||
          (room.departmentId ? assignmentLabel : "Shared room")}
      </div>
    </button>
  );
}
