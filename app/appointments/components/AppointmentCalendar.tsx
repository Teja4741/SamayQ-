
"use client";

// Displays appointments in day, week, and month calendar views.

import type {
  Appointment,
  Patient,
  Doctor,
  Department,
  ViewMode,
} from "../utils/types";

import {
  formatDate,
  formatTime,
  addDays,
  getStartOfWeek,
  getDaysInMonth,
} from "../utils/dateUtils";

type AppointmentCalendarProps = {
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
  departments: Department[];
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  view: ViewMode;
  setView: (view: ViewMode) => void;
  onCancel: (id: string) => void;
};

export default function AppointmentCalendar({
  appointments,
  patients,
  doctors,
  departments,
  selectedDate,
  setSelectedDate,
  view,
  setView,
  onCancel,
}: AppointmentCalendarProps) {
  function getAppointmentDetails(appointment: Appointment) {
    const patient = patients.find(
      (item) => item.id === appointment.patient_id
    );

    const doctor = doctors.find(
      (item) =>
        item.id === appointment.doctor_clinic_assignment_id
    );

    const departmentId =
      appointment.department_id ?? doctor?.departmentId;

    const department = departments.find(
      (item) => item.id === departmentId
    );

    return {
      patientName: patient?.full_name ?? "Unknown patient",
      doctorName: doctor?.name ?? "Department booking",
      departmentName: department?.name ?? "No department",
    };
  }

  function getAppointmentsForDate(date: Date) {
    const dateString = formatDate(date);

    return appointments
      .filter(
        (appointment) =>
          appointment.appointment_date === dateString
      )
      .sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      );
  }

  function changeDate(direction: number) {
    const nextDate = new Date(selectedDate);

    if (view === "day") {
      nextDate.setDate(nextDate.getDate() + direction);
    } else if (view === "week") {
      nextDate.setDate(nextDate.getDate() + direction * 7);
    } else {
      nextDate.setMonth(nextDate.getMonth() + direction);
    }

    setSelectedDate(nextDate);
  }

  function renderAppointment(appointment: Appointment) {
    const details = getAppointmentDetails(appointment);

    return (
      <div
        key={appointment.id}
        className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {details.patientName}
            </p>

            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {formatTime(appointment.start_time)}
            </p>

            <p className="text-sm text-gray-600 dark:text-gray-300">
              {details.doctorName}
            </p>

            <p className="text-sm text-gray-600 dark:text-gray-300">
              {details.departmentName}
            </p>

            <p className="mt-1 text-xs capitalize text-gray-500">
              {appointment.status.replaceAll("_", " ")}
            </p>
          </div>

          {appointment.status.toLowerCase() !== "cancelled" && (
            <button
              type="button"
              onClick={() => onCancel(appointment.id)}
              className="text-left text-sm font-medium text-red-600 hover:text-red-700"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderDayView() {
    const dayAppointments = getAppointmentsForDate(selectedDate);

    return (
      <div className="space-y-3">
        {dayAppointments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
            No appointments for this day.
          </p>
        ) : (
          dayAppointments.map(renderAppointment)
        )}
      </div>
    );
  }

  function renderWeekView() {
    const weekStart = getStartOfWeek(selectedDate);

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 7 }, (_, index) => {
          const date = addDays(weekStart, index);
          const dayAppointments = getAppointmentsForDate(date);

          return (
            <div
              key={formatDate(date)}
              className="min-w-0 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(date);
                  setView("day");
                }}
                className="mb-3 text-left"
              >
                <p className="text-sm font-medium text-gray-500">
                  {date.toLocaleDateString("en-IN", {
                    weekday: "short",
                  })}
                </p>

                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {date.getDate()}
                </p>
              </button>

              <div className="space-y-2">
                {dayAppointments.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    No appointments
                  </p>
                ) : (
                  dayAppointments.map(renderAppointment)
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderMonthView() {
    const days = getDaysInMonth(selectedDate);

    const firstDay = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      1
    ).getDay();

    return (
      <div>
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
            (day) => (
              <div key={day} className="p-2">
                {day}
              </div>
            )
          )}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }, (_, index) => (
            <div key={`empty-${index}`} />
          ))}

          {days.map((date) => {
            const dayAppointments = getAppointmentsForDate(date);

            return (
              <button
                key={formatDate(date)}
                type="button"
                onClick={() => {
                  setSelectedDate(date);
                  setView("day");
                }}
                className="flex min-h-20 flex-col items-center rounded-lg border border-gray-200 p-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {date.getDate()}
                </span>

                {dayAppointments.length > 0 && (
                  <span className="mt-2 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                    {dayAppointments.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const heading = selectedDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => changeDate(-1)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
          >
            ←
          </button>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {heading}
          </h2>

          <button
            type="button"
            onClick={() => changeDate(1)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
          >
            →
          </button>
        </div>

        <div className="flex gap-2">
          {(["day", "week", "month"] as ViewMode[]).map(
            (mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
                  view === mode
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {mode}
              </button>
            )
          )}
        </div>
      </div>

      {view === "day" && renderDayView()}
      {view === "week" && renderWeekView()}
      {view === "month" && renderMonthView()}
    </section>
  );
}
