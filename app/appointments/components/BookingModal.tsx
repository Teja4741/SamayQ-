
"use client";

// Displays the receptionist appointment booking form.

import type { FormEvent } from "react";

import type {
  Doctor,
  Department,
  BookingMode,
} from "../utils/types";

type BookingModalProps = {
  isOpen: boolean;
  bookingMode: BookingMode;
  doctors: Doctor[];
  departments: Department[];

  patientName: string;
  setPatientName: (value: string) => void;

  patientPhone: string;
  setPatientPhone: (value: string) => void;

  patientAge: string;
  setPatientAge: (value: string) => void;

  assignmentId: string;
  setAssignmentId: (value: string) => void;

  bookingDepartmentId: string;
  setBookingDepartmentId: (value: string) => void;

  appointmentDate: string;
  setAppointmentDate: (value: string) => void;

  startTime: string;
  setStartTime: (value: string) => void;

  notes: string;
  setNotes: (value: string) => void;

  saving: boolean;
  notice: string;

  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function BookingModal({
  isOpen,
  bookingMode,
  doctors,
  departments,
  patientName,
  setPatientName,
  patientPhone,
  setPatientPhone,
  patientAge,
  setPatientAge,
  assignmentId,
  setAssignmentId,
  bookingDepartmentId,
  setBookingDepartmentId,
  appointmentDate,
  setAppointmentDate,
  startTime,
  setStartTime,
  notes,
  setNotes,
  saving,
  notice,
  onClose,
  onSubmit,
}: BookingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              New Appointment
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter patient details and appointment information.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg px-3 py-2 text-xl text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Patient Details
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Patient Name *
                </label>

                <input
                  type="text"
                  required
                  maxLength={100}
                  value={patientName}
                  onChange={(event) =>
                    setPatientName(event.target.value)
                  }
                  placeholder="Enter patient name"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Phone Number *
                  </label>

                  <input
                    type="tel"
                    required
                    maxLength={15}
                    value={patientPhone}
                    onChange={(event) =>
                      setPatientPhone(event.target.value)
                    }
                    placeholder="Enter phone number"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Age (Optional)
                  </label>

                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={patientAge}
                    onChange={(event) =>
                      setPatientAge(event.target.value)
                    }
                    placeholder="Enter age"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Appointment Details
            </h3>

            {bookingMode === "doctor" ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Doctor *
                </label>

                <select
                  required
                  value={assignmentId}
                  onChange={(event) => {
                    const selectedId = event.target.value;
                    setAssignmentId(selectedId);

                    const selectedDoctor = doctors.find(
                      (doctor) => doctor.id === selectedId
                    );

                    setBookingDepartmentId(
                      selectedDoctor?.departmentId ?? ""
                    );
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select Doctor</option>

                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name}
                    </option>
                  ))}
                </select>

                {doctors.length === 0 && (
                  <p className="mt-2 text-sm text-amber-600">
                    No doctors are available for this clinic.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Department *
                </label>

                <select
                  required
                  value={bookingDepartmentId}
                  onChange={(event) =>
                    setBookingDepartmentId(event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select Department</option>

                  {departments.map((department) => (
                    <option
                      key={department.id}
                      value={department.id}
                    >
                      {department.name}
                    </option>
                  ))}
                </select>

                {departments.length === 0 && (
                  <p className="mt-2 text-sm text-amber-600">
                    No departments are available for this clinic.
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Appointment Date *
                </label>

                <input
                  type="date"
                  required
                  value={appointmentDate}
                  onChange={(event) =>
                    setAppointmentDate(event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Appointment Time *
                </label>

                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(event) =>
                    setStartTime(event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notes (Optional)
            </label>

            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Enter appointment notes..."
              className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {notice && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
              {notice}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Close
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                !patientName.trim() ||
                !patientPhone.trim() ||
                (bookingMode === "doctor" && !assignmentId) ||
                (bookingMode === "department" &&
                  !bookingDepartmentId)
              }
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Booking..." : "Book Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
