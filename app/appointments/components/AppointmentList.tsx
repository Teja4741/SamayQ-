
"use client";

// Displays appointment records in a list with patient details and actions.

import type {
  Appointment,
  Patient,
  Doctor,
  Department,
} from "../utils/types";

import { formatTime } from "../utils/dateUtils";

type AppointmentListProps = {
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
  departments: Department[];
  onCancel: (id: string) => void;
};

export default function AppointmentList({
  appointments,
  patients,
  doctors,
  departments,
  onCancel,
}: AppointmentListProps) {
  function getPatient(patientId: string) {
    return patients.find((patient) => patient.id === patientId);
  }

  function getDoctor(assignmentId: string | null) {
    return doctors.find((doctor) => doctor.id === assignmentId);
  }

  function getDepartment(appointment: Appointment) {
    const doctor = getDoctor(
      appointment.doctor_clinic_assignment_id
    );

    const departmentId =
      appointment.department_id ?? doctor?.departmentId;

    return departments.find(
      (department) => department.id === departmentId
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No appointments found.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <table className="w-full min-w-[750px] text-left text-sm">
        <thead className="bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          <tr>
            <th className="px-4 py-3 font-semibold">Patient</th>
            <th className="px-4 py-3 font-semibold">Doctor</th>
            <th className="px-4 py-3 font-semibold">Department</th>
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Time</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {appointments.map((appointment) => {
            const patient = getPatient(appointment.patient_id);

            const doctor = getDoctor(
              appointment.doctor_clinic_assignment_id
            );

            const department = getDepartment(appointment);

            const isCancelled =
              appointment.status.toLowerCase() === "cancelled";

            return (
              <tr
                key={appointment.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {patient?.full_name ?? "Unknown patient"}
                  </p>

                  <p className="text-xs text-gray-500">
                    {patient?.phone ?? "No phone number"}
                  </p>
                </td>

                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {doctor?.name ?? "Department booking"}
                </td>

                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {department?.name ?? "—"}
                </td>

                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {new Date(
                    `${appointment.appointment_date}T00:00:00`
                  ).toLocaleDateString("en-IN")}
                </td>

                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {formatTime(appointment.start_time)}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                      isCancelled
                        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                        : appointment.status.toLowerCase() ===
                            "confirmed"
                          ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {appointment.status.replaceAll("_", " ")}
                  </span>
                </td>

                <td className="px-4 py-3">
                  {!isCancelled && (
                    <button
                      type="button"
                      onClick={() => onCancel(appointment.id)}
                      className="font-medium text-red-600 hover:text-red-700"
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
