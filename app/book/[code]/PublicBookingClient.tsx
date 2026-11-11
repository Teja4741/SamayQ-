
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPublicAppointment } from "./actions";

type Clinic = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
};

type Department = {
  id: string;
  name: string;
};

type Doctor = {
  assignment_id: string;
  doctor_id: string;
  doctor_name: string;
  specialization: string | null;
  department_id: string | null;
  department_name: string | null;
  duration_minutes: number;
};

type Props = {
  code: string;
  clinic: Clinic;
  bookingMode: "doctor" | "department";
  departments: Department[];
  doctors: Doctor[];
};

export default function PublicBookingClient({
  code,
  clinic,
  bookingMode,
  departments,
  doctors,
}: Props) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedDoctor = doctors.find(
    (doctor) => doctor.assignment_id === assignmentId
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (bookingMode === "doctor" && !assignmentId) {
      setMessage("Please select a doctor.");
      return;
    }

    if (bookingMode === "department" && !departmentId) {
      setMessage("Please select a department.");
      return;
    }

    setLoading(true);

    try {
      const result = await createPublicAppointment({
        code,
        patientName: name,
        patientPhone: phone,
        patientAge: age ? Number(age) : null,
        assignmentId: bookingMode === "doctor" ? assignmentId : null,
        departmentId: bookingMode === "department" ? departmentId : null,
        appointmentDate: date,
        startTime: time,
        notes,
      });

      if (result.success && result.trackingToken) {
        router.push(
          `/track/${encodeURIComponent(result.trackingToken)}`
        );
        return;
      }

      setMessage(result.message);
    } catch (error) {
      console.error("Public appointment submission error:", error);
      setMessage("Unable to book your appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold">{clinic.name}</h1>

          {clinic.address && (
            <p className="mt-1 text-sm text-gray-500">
              {clinic.address}
            </p>
          )}

          <div className="my-6 border-t" />

          <h2 className="text-lg font-semibold">
            Book an appointment
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Enter your details to request an appointment.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Patient name */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Patient name *
              </label>

              <input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border p-3"
                placeholder="Enter patient name"
                disabled={loading}
              />
            </div>

            {/* Phone number */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Mobile number *
              </label>

              <input
                required
                maxLength={15}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border p-3"
                placeholder="Enter mobile number"
                inputMode="tel"
                disabled={loading}
              />
            </div>

            {/* Age */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Age
              </label>

              <input
                type="number"
                min={0}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full rounded-lg border p-3"
                placeholder="Enter age (optional)"
                disabled={loading}
              />
            </div>

            {/* Doctor-wise booking */}
            {bookingMode === "doctor" ? (
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Select doctor *
                </label>

                <select
                  required
                  value={assignmentId}
                  onChange={(e) => setAssignmentId(e.target.value)}
                  className="w-full rounded-lg border p-3"
                  disabled={loading}
                >
                  <option value="">Choose a doctor</option>

                  {doctors.map((doctor) => (
                    <option
                      key={doctor.assignment_id}
                      value={doctor.assignment_id}
                    >
                      {doctor.doctor_name}
                      {doctor.specialization
                        ? ` — ${doctor.specialization}`
                        : ""}
                    </option>
                  ))}
                </select>

                {selectedDoctor?.department_name && (
                  <p className="mt-1 text-xs text-gray-500">
                    Department: {selectedDoctor.department_name}
                  </p>
                )}
              </div>
            ) : (
              /* Department-wise booking */
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Select department *
                </label>

                <select
                  required
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full rounded-lg border p-3"
                  disabled={loading}
                >
                  <option value="">Choose a department</option>

                  {departments.map((department) => (
                    <option
                      key={department.id}
                      value={department.id}
                    >
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Appointment date */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Appointment date *
              </label>

              <input
                required
                type="date"
                min={new Date().toLocaleDateString("en-CA")}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border p-3"
                disabled={loading}
              />
            </div>

            {/* Appointment time */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Appointment time *
              </label>

              <input
                required
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border p-3"
                disabled={loading}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Additional notes
              </label>

              <textarea
                rows={3}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border p-3"
                placeholder="Optional notes"
                disabled={loading}
              />
            </div>

            {/* Error message */}
            {message && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {message}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Booking..."
                : "Confirm appointment"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
