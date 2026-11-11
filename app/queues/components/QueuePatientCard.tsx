
"use client";

import type { QueuePatient } from "../types/index";
import { formatQueueTime } from "../utils/queueHelpers";

type QueuePatientCardProps = {
  patient: QueuePatient;
};

export default function QueuePatientCard({
  patient,
}: QueuePatientCardProps) {
  const statusStyles = {
    active:
      "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    missed:
      "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    done:
      "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  };

  const typeStyles =
    patient.type === "appointment"
      ? "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950">
          <span className="text-[10px] font-medium uppercase text-blue-500">
            Token
          </span>
          <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
            {patient.tokenNumber ?? "--"}
          </span>
        </div>

        <div className="min-w-0">
          <h3 className="truncate font-semibold text-gray-900 dark:text-white">
            {patient.name}
          </h3>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {patient.phone}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${typeStyles}`}
            >
              {patient.type === "appointment" ? "Reserved" : "Walk-in"}
            </span>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[patient.status]}`}
            >
              {patient.status}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-3 text-sm dark:border-gray-800 sm:border-t-0 sm:pt-0">
        <div>
          <p className="text-xs text-gray-400">Joined at</p>
          <p className="mt-1 font-medium text-gray-700 dark:text-gray-300">
            {formatQueueTime(patient.joinedAt)}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-400">Current room</p>
          <p className="mt-1 font-medium text-gray-700 dark:text-gray-300">
            {patient.roomName || "Not assigned"}
          </p>
        </div>
      </div>
    </article>
  );
}
