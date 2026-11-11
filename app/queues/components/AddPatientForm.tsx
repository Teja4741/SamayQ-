
"use client";

import { useMemo, useState } from "react";

import type {
  BookingMode,
  QueueDoctorOption,
  QueueDepartmentOption,
} from "../types";

export type ReturningPatient = {
  id: string;
  full_name: string;
  phone: string;
};

export type AvailableAppointment = {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  start_time: string;
};

export type AddPatientFormData = {
  patientId: string | null;
  patientName: string;
  phone: string;
  entryType: "walk_in" | "appointment";
  appointmentId: string | null;
  doctorAssignmentId: string | null;
  departmentId: string | null;
};

type AddPatientFormProps = {
  bookingMode: BookingMode;
  doctors: QueueDoctorOption[];
  departments: QueueDepartmentOption[];
  returningPatients: ReturningPatient[];
  availableAppointments: AvailableAppointment[];
  onSubmit: (data: AddPatientFormData) => Promise<void>;
};

export default function AddPatientForm({
  bookingMode,
  doctors,
  departments,
  returningPatients,
  availableAppointments,
  onSubmit,
}: AddPatientFormProps) {
  const [expanded, setExpanded] = useState(true);
  const [returningOpen, setReturningOpen] = useState(false);

  const [entryType, setEntryType] = useState<
    "walk_in" | "appointment"
  >("walk_in");

  const [patientId, setPatientId] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState("");

  const [patientName, setPatientName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [searchPhone, setSearchPhone] = useState("");

  const [doctorAssignmentId, setDoctorAssignmentId] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const matchedPatient = useMemo(() => {
    const normalized = searchPhone.replace(/\D/g, "");

    if (normalized.length < 10) return null;

    return (
      returningPatients.find(
        (patient) =>
          patient.phone.replace(/\D/g, "") === normalized
      ) ?? null
    );
  }, [searchPhone, returningPatients]);

  const handleReturningPatient = () => {
    if (!matchedPatient) return;

    setPatientId(matchedPatient.id);
    setPatientName(matchedPatient.full_name);
    setPhone(matchedPatient.phone.replace(/\D/g, ""));
    setCountryCode("+91");
    setReturningOpen(false);
  };

  const handleAppointmentChange = (id: string) => {
    setAppointmentId(id);

    const appointment = availableAppointments.find(
      (item) => item.id === id
    );

    if (appointment) {
      setPatientId(appointment.patient_id);
      setPatientName(appointment.patient_name);
      setPhone(appointment.patient_phone.replace(/\D/g, ""));
    } else {
      setPatientId(null);
      setPatientName("");
      setPhone("");
    }
  };

  const resetForm = () => {
    setPatientId(null);
    setAppointmentId("");
    setPatientName("");
    setPhone("");
    setSearchPhone("");
    setDoctorAssignmentId("");
    setDepartmentId("");
    setEntryType("walk_in");
    setError("");
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    if (bookingMode === "doctor" && !doctorAssignmentId) {
      setError("Please select a doctor.");
      return;
    }

    if (bookingMode === "department" && !departmentId) {
      setError("Please select a department.");
      return;
    }

    if (patientName.trim().length < 2) {
      setError("Please enter a valid patient name.");
      return;
    }

    const normalizedPhone = phone.replace(/\D/g, "");

    if (
      normalizedPhone.length < 7 ||
      normalizedPhone.length > 15
    ) {
      setError("Please enter a valid WhatsApp number.");
      return;
    }

    if (entryType === "appointment" && !appointmentId) {
      setError("Please select an appointment.");
      return;
    }

    const countryDigits = countryCode.replace(/\D/g, "");

    const fullPhone = normalizedPhone.startsWith(countryDigits)
      ? normalizedPhone
      : `${countryDigits}${normalizedPhone}`;

    if (fullPhone.length > 15) {
      setError("The complete phone number is too long.");
      return;
    }

    try {
      setLoading(true);

      await onSubmit({
        patientId,
        patientName: patientName.trim(),
        phone: fullPhone,
        entryType,
        appointmentId:
          entryType === "appointment" ? appointmentId : null,
        doctorAssignmentId:
          bookingMode === "doctor" ? doctorAssignmentId : null,
        departmentId:
          bookingMode === "department" ? departmentId : null,
      });

      resetForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to add patient to queue."
      );
    } finally {
      setLoading(false);
    }
  };

  const selectionOptions =
    bookingMode === "doctor" ? doctors : departments;

  const selectionLabel =
    bookingMode === "doctor" ? "Doctor" : "Department";

  const selectedValue =
    bookingMode === "doctor"
      ? doctorAssignmentId
      : departmentId;

  const handleSelectionChange = (value: string) => {
    if (bookingMode === "doctor") {
      setDoctorAssignmentId(value);
    } else {
      setDepartmentId(value);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full overflow-hidden rounded-xl border border-violet-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between px-6 py-5 text-left"
      >
        <span className="flex items-center gap-3 text-lg font-semibold text-gray-900 dark:text-white">
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-500"
          >
            <circle cx="10" cy="8" r="4" />
            <path d="M3 21v-2a7 7 0 0 1 14 0v2" />
            <path d="M19 8v6M16 11h6" />
          </svg>
          Add patient
        </span>

        <span className="text-gray-500">
          {expanded ? "⌃" : "⌄"}
        </span>
      </button>

      {expanded && (
        <div className="px-6 pb-6">
          {/* Returning patient */}
          <div className="mb-5">
            <button
              type="button"
              onClick={() =>
                setReturningOpen((value) => !value)
              }
              aria-expanded={returningOpen}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 text-left text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <span className="text-violet-600">◷</span>

              <span className="font-semibold text-gray-800 dark:text-gray-200">
                Returning patient?
              </span>

              <span className="text-gray-500">
                Seen here recently
              </span>

              <span className="ml-auto text-gray-500">
                {returningOpen ? "⌃" : "⌄"}
              </span>
            </button>

            {returningOpen && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="tel"
                  value={searchPhone}
                  onChange={(event) =>
                    setSearchPhone(event.target.value)
                  }
                  placeholder="Search previous WhatsApp number"
                  className="h-12 min-w-0 flex-1 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950"
                />

                <button
                  type="button"
                  onClick={handleReturningPatient}
                  disabled={!matchedPatient}
                  className="rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Select patient
                </button>

                {matchedPatient && (
                  <p className="self-center text-sm text-green-600">
                    {matchedPatient.full_name} found
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Main form grid */}
          <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
            {/* Type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-500 dark:text-gray-300">
                Type
              </label>

              <select
                value={entryType}
                onChange={(event) => {
                  const value = event.target.value as
                    | "walk_in"
                    | "appointment";

                  setEntryType(value);
                  setAppointmentId("");

                  if (value === "walk_in") {
                    setPatientId(null);
                  }
                }}
                className="h-14 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="walk_in">Walk-in</option>
                <option value="appointment">Reserved</option>
              </select>
            </div>

            {/* Doctor / Department */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-500 dark:text-gray-300">
                {selectionLabel}
                <span className="ml-1 text-red-500">*</span>
              </label>

              <select
                value={selectedValue}
                onChange={(event) =>
                  handleSelectionChange(event.target.value)
                }
                required
                className="h-14 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="">
                  Select {selectionLabel.toLowerCase()}
                </option>

                {selectionOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>

              {selectionOptions.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600">
                  No {selectionLabel.toLowerCase()} options found for this clinic.
                </p>
              )}
            </div>

            {/* Appointment */}
            {entryType === "appointment" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-500 dark:text-gray-300">
                  Appointment
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <select
                  value={appointmentId}
                  onChange={(event) =>
                    handleAppointmentChange(event.target.value)
                  }
                  required
                  className="h-14 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="">Select appointment</option>

                  {availableAppointments.map((appointment) => (
                    <option
                      key={appointment.id}
                      value={appointment.id}
                    >
                      {appointment.patient_name} — {appointment.start_time}
                    </option>
                  ))}
                </select>

                {availableAppointments.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    No available appointments found.
                  </p>
                )}
              </div>
            )}

            {/* Patient name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-500 dark:text-gray-300">
                Patient name
              </label>

              <input
                type="text"
                value={patientName}
                onChange={(event) =>
                  setPatientName(event.target.value)
                }
                placeholder="Patient name"
                readOnly={
                  entryType === "appointment" &&
                  Boolean(appointmentId)
                }
                className="h-14 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-violet-500 read-only:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:read-only:bg-gray-800"
              />
            </div>

            {/* WhatsApp number */}
            <div className="md:col-span-2 xl:col-span-1">
              <label className="mb-1.5 block text-sm font-medium text-slate-500 dark:text-gray-300">
                WhatsApp number
              </label>

              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(event) =>
                    setCountryCode(event.target.value)
                  }
                  className="h-14 w-28 shrink-0 rounded-xl border border-gray-200 bg-gray-50 px-2 text-sm outline-none dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="+91">IN +91</option>
                  <option value="+1">US +1</option>
                  <option value="+44">UK +44</option>
                  <option value="+971">UAE +971</option>
                </select>

                <input
                  type="tel"
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="WhatsApp number"
                  readOnly={
                    entryType === "appointment" &&
                    Boolean(appointmentId)
                  }
                  className="h-14 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-violet-500 read-only:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:read-only:bg-gray-800"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="min-w-44 rounded-xl bg-violet-600 px-7 py-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Adding..." : "Add to queue"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
