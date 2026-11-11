
"use client";

import { useState, type FormEvent } from "react";
import type {
  BookingMode,
  RoomAssignmentOption,
  CreateRoomInput,
} from "../types";

type AddRoomFormProps = {
  clinicId: string;
  bookingMode: BookingMode;
  options: RoomAssignmentOption[];
  onSubmit: (input: CreateRoomInput) => Promise<void>;
  onCancel: () => void;
};

export default function AddRoomForm({
  clinicId,
  bookingMode,
  options,
  onSubmit,
  onCancel,
}: AddRoomFormProps) {
  const [name, setName] = useState("");
  const [roomType, setRoomType] = useState("consultation");
  const [assignmentId, setAssignmentId] = useState("");
  const [displayOrder, setDisplayOrder] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const order = Number(displayOrder);

    if (!trimmedName) {
      setError("Room name is required.");
      return;
    }

    if (!Number.isInteger(order) || order < 1) {
      setError("Display order must be a positive whole number.");
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        clinicId,
        name: trimmedName,
        roomType,
        displayOrder: order,
        assignmentId: assignmentId || null,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create room."
      );
    } finally {
      setLoading(false);
    }
  }

  const assignmentLabel =
    bookingMode === "doctor" ? "Doctor" : "Department";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Add New Room
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create a room for your hospital.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Room Name *
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Room A1"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Room Type *
            </label>
            <select
              value={roomType}
              onChange={(event) => setRoomType(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-950"
            >
              <option value="consultation">Consultation</option>
              <option value="waiting">Waiting</option>
              <option value="diagnostic">Diagnostic</option>
              <option value="treatment">Treatment</option>
              <option value="procedure">Procedure</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Assign {assignmentLabel} (Optional)
            </label>

            <select
              value={assignmentId}
              onChange={(event) => setAssignmentId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-950"
            >
              <option value="">No assignment — Shared Room</option>

              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>

            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Leave this empty if the room is shared.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Display Order
            </label>
            <input
              type="number"
              min="1"
              value={displayOrder}
              onChange={(event) => setDisplayOrder(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-950"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium dark:border-gray-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
