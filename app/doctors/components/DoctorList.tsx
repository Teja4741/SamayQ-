
"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Doctor } from "../utils/types";
import {
  deleteDoctor,
  updateDoctor,
} from "../actions";

type DoctorListProps = {
  clinicId: string;
  doctors: Doctor[];
  onDoctorUpdated: () => void;
};

export default function DoctorList({
  clinicId,
  doctors,
  onDoctorUpdated,
}: DoctorListProps) {
  const [doctorList, setDoctorList] = useState<Doctor[]>(doctors);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    setDoctorList(doctors);
  }, [doctors]);

  // ------------------------------------------
  // Delete Doctor
  // ------------------------------------------

  const handleDelete = async (assignmentId: string) => {
    if (!clinicId || !assignmentId) {
      setDeleteError("Clinic or doctor assignment information is missing.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to remove this doctor from this clinic?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(assignmentId);
      setDeleteError("");

      const result = await deleteDoctor(clinicId, assignmentId);

      if (!result.success) {
        setDeleteError(result.message || "Unable to delete doctor.");
        return;
      }

      setDoctorList((previous) =>
        previous.filter(
          (doctor) => doctor.assignmentId !== assignmentId
        )
      );

      onDoctorUpdated();
    } catch (error) {
      console.error("Delete doctor error:", error);
      setDeleteError("Something went wrong while deleting the doctor.");
    } finally {
      setDeletingId(null);
    }
  };

  // ------------------------------------------
  // Change Availability
  // ------------------------------------------

  const handleAvailability = (assignmentId: string) => {
    setDoctorList((previous) =>
      previous.map((doctor) =>
        doctor.assignmentId === assignmentId
          ? {
              ...doctor,
              availability:
                doctor.availability === "Available"
                  ? "Away"
                  : "Available",
            }
          : doctor
      )
    );
  };

  // ------------------------------------------
  // Change Screen Status
  // ------------------------------------------

  const handleScreenStatus = (assignmentId: string) => {
    setDoctorList((previous) =>
      previous.map((doctor) =>
        doctor.assignmentId === assignmentId
          ? { ...doctor, isOnScreen: !doctor.isOnScreen }
          : doctor
      )
    );
  };

  // ------------------------------------------
  // Save Doctor Changes to Supabase
  // ------------------------------------------

  const handleSaveEdit = async (updatedDoctor: Doctor) => {
    if (!clinicId) return;

    try {
      const result = await updateDoctor(clinicId, {
        doctorId: updatedDoctor.id,
        assignmentId: updatedDoctor.assignmentId,
        name: updatedDoctor.name,
        consultationDuration: updatedDoctor.consultationDuration,
        patientsAtOnce: updatedDoctor.patientsAtOnce,
        consultationPrice: updatedDoctor.consultationPrice,
        tokenPrefix: updatedDoctor.tokenPrefix,
      });

      if (!result.success) {
        return {
          success: false,
          message: result.message || "Unable to update doctor.",
        };
      }

      setDoctorList((previous) =>
        previous.map((doctor) =>
          doctor.assignmentId === updatedDoctor.assignmentId
            ? updatedDoctor
            : doctor
        )
      );

      setEditingDoctor(null);
      onDoctorUpdated();

      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      console.error("Update doctor error:", error);

      return {
        success: false,
        message: "Something went wrong while updating the doctor.",
      };
    }
  };

  return (
    <section className="space-y-4">

      {/* Header */}
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Doctor List
          </h2>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage doctors and their consultation availability.
          </p>
        </div>

        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {doctorList.length} Doctors
        </span>
      </div>

      {/* Delete Error */}
      {deleteError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
          <p className="text-sm text-red-600 dark:text-red-400">
            {deleteError}
          </p>
        </div>
      )}

      {/* Empty State */}
      {doctorList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <h3 className="font-semibold text-slate-800 dark:text-white">
            No doctors added yet
          </h3>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Add a doctor using the form above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {doctorList.map((doctor) => (
            <div
              key={doctor.assignmentId}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Doctor Header */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {doctor.name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    ₹{doctor.consultationPrice} consultation
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    doctor.availability === "Available"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}
                >
                  {doctor.availability}
                </span>
              </div>

              {/* Consultation Details */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Consultation Duration
                  </p>

                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                    {doctor.consultationDuration} minutes
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Patients at Once
                  </p>

                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                    {doctor.patientsAtOnce}
                  </p>
                </div>
              </div>

              {/* Token Prefix */}
              <div className="mt-3 rounded-lg bg-violet-50 p-3 dark:bg-violet-900/20">
                <p className="text-xs text-violet-600 dark:text-violet-300">
                  Token Prefix
                </p>

                <p className="mt-1 font-semibold text-violet-800 dark:text-violet-200">
                  {doctor.tokenPrefix || "Not configured"}
                </p>

                {doctor.tokenPrefix && (
                  <p className="mt-1 text-xs text-violet-600 dark:text-violet-400">
                    Example: {doctor.tokenPrefix}1, {doctor.tokenPrefix}2,{" "}
                    {doctor.tokenPrefix}3
                  </p>
                )}
              </div>

              {/* Working Schedule */}
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Working Days
                </p>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {doctor.workingDays.map((day) => (
                    <span
                      key={day}
                      className="rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                    >
                      {day}
                    </span>
                  ))}
                </div>

                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {doctor.startTime} – {doctor.endTime}
                </p>
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleScreenStatus(doctor.assignmentId)}
                  className="text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400"
                >
                  {doctor.isOnScreen ? "On-screen" : "Off-screen"}
                </button>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDoctor(doctor)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDelete(doctor.assignmentId)}
                    disabled={deletingId === doctor.assignmentId}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950"
                  >
                    {deletingId === doctor.assignmentId
                      ? "Deleting..."
                      : "Delete"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAvailability(doctor.assignmentId)}
                    className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Change Status
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Doctor Modal */}
      {editingDoctor && (
        <EditDoctorForm
          key={editingDoctor.assignmentId}
          doctor={editingDoctor}
          onClose={() => setEditingDoctor(null)}
          onSave={handleSaveEdit}
        />
      )}
    </section>
  );
}

// --------------------------------------------------
// Edit Doctor Form
// --------------------------------------------------

function EditDoctorForm({
  doctor,
  onClose,
  onSave,
}: {
  doctor: Doctor;
  onClose: () => void;
  onSave: (
    doctor: Doctor
  ) => Promise<
    { success: boolean; message: string } | undefined
  >;
}) {
  const [name, setName] = useState(doctor.name);

  const [duration, setDuration] = useState(
    String(doctor.consultationDuration)
  );

  const [patients, setPatients] = useState(
    String(doctor.patientsAtOnce)
  );

  const [price, setPrice] = useState(
    String(doctor.consultationPrice)
  );

  const [tokenPrefix, setTokenPrefix] = useState(
    doctor.tokenPrefix ?? ""
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const normalizedPrefix = tokenPrefix.trim().toUpperCase();

    if (
      !name.trim() ||
      !Number.isInteger(Number(duration)) ||
      Number(duration) <= 0 ||
      !Number.isInteger(Number(patients)) ||
      Number(patients) <= 0 ||
      price.trim() === "" ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0
    ) {
      setError("Please enter valid doctor details.");
      return;
    }

    if (!/^[A-Z0-9]{1,6}$/.test(normalizedPrefix)) {
      setError(
        "Token prefix is required and must contain 1–6 letters or numbers."
      );
      return;
    }

    try {
      setLoading(true);

      const result = await onSave({
        ...doctor,
        name: name.trim(),
        consultationDuration: Number(duration),
        patientsAtOnce: Number(patients),
        consultationPrice: Number(price),
        tokenPrefix: normalizedPrefix,
      });

      if (!result?.success) {
        setError(result?.message || "Unable to save doctor settings.");
      }
    } catch (error) {
      console.error("Edit doctor save error:", error);
      setError("Something went wrong while saving doctor settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Edit Doctor
        </h3>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Update consultation settings and token configuration.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Doctor Name */}
          <div>
            <label
              htmlFor="editDoctorName"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Doctor Name
            </label>

            <input
              id="editDoctorName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              required
            />
          </div>

          {/* Duration and Patients */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="editDuration"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Duration (minutes)
              </label>

              <input
                id="editDuration"
                type="number"
                min="1"
                step="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                required
              />
            </div>

            <div>
              <label
                htmlFor="editPatients"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Patients at Once
              </label>

              <input
                id="editPatients"
                type="number"
                min="1"
                step="1"
                value={patients}
                onChange={(e) => setPatients(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Consultation Price */}
          <div>
            <label
              htmlFor="editPrice"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Consultation Price (₹)
            </label>

            <input
              id="editPrice"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              required
            />
          </div>

          {/* Token Prefix */}
          <div>
            <label
              htmlFor="editTokenPrefix"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Token Prefix
            </label>

            <input
              id="editTokenPrefix"
              type="text"
              value={tokenPrefix}
              onChange={(e) =>
                setTokenPrefix(
                  e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
                )
              }
              placeholder="Example: S"
              maxLength={6}
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm uppercase dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              required
            />

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Enter a unique prefix for this doctor's queue. Example: S1, S2, S3.
            </p>

            {tokenPrefix.trim() && (
              <div className="mt-2 rounded-lg bg-violet-50 p-3 dark:bg-violet-900/20">
                <p className="text-xs text-violet-600 dark:text-violet-300">
                  Token preview
                </p>

                <p className="mt-1 font-semibold text-violet-800 dark:text-violet-200">
                  {tokenPrefix}1 · {tokenPrefix}2 · {tokenPrefix}3
                </p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/30">
              <p className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
