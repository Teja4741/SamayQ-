
"use client";

// Connects appointment data, filters, statistics, calendar, list, and booking form.

import { useAppointments } from "./hooks/useAppointments";

import AppointmentFilters from "./components/AppointmentFilters";
import AppointmentStats from "./components/AppointmentStats";
import AppointmentCalendar from "./components/AppointmentCalendar";
import AppointmentList from "./components/AppointmentList";
import BookingModal from "./components/BookingModal";

type Props = {
  clinicId: string;
  clinicName: string;
};

export default function AppointmentsClient({
  clinicId,
  clinicName,
}: Props) {
  const appointments = useAppointments(clinicId);

  if (appointments.loading) {
    return (
      <main className="mx-auto flex min-h-[300px] w-full max-w-[1440px] items-center justify-center px-4 sm:px-6 lg:px-8">
        <p className="text-sm text-gray-500">
          Loading appointments...
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Appointments
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage appointments for {clinicName}
          </p>
        </div>

        {appointments.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {appointments.error}
          </div>
        )}

        {appointments.notice && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
            {appointments.notice}
          </div>
        )}

        <AppointmentFilters
          search={appointments.search}
          setSearch={appointments.setSearch}
          onAddAppointment={appointments.openBooking}
        />

        <AppointmentStats
          totalAppointments={appointments.activeAppointments.length}
          totalPatients={appointments.uniquePatients}
          peakHour={appointments.peakHour}
        />

        <AppointmentCalendar
          appointments={appointments.filteredAppointments}
          patients={appointments.patients}
          doctors={appointments.doctors}
          departments={appointments.departments}
          selectedDate={appointments.selectedDate}
          setSelectedDate={appointments.setSelectedDate}
          view={appointments.view}
          setView={appointments.setView}
          onCancel={appointments.handleCancel}
        />

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Appointment Records
          </h2>

          <AppointmentList
            appointments={appointments.visibleAppointments}
            patients={appointments.patients}
            doctors={appointments.doctors}
            departments={appointments.departments}
            onCancel={appointments.handleCancel}
          />
        </div>

        <BookingModal
          isOpen={appointments.modalOpen}
          bookingMode={appointments.bookingMode}
          doctors={appointments.doctors}
          departments={appointments.departments}
          patientName={appointments.patientName}
          setPatientName={appointments.setPatientName}
          patientPhone={appointments.patientPhone}
          setPatientPhone={appointments.setPatientPhone}
          patientAge={appointments.patientAge}
          setPatientAge={appointments.setPatientAge}
          assignmentId={appointments.assignmentId}
          setAssignmentId={appointments.setAssignmentId}
          bookingDepartmentId={appointments.bookingDepartmentId}
          setBookingDepartmentId={appointments.setBookingDepartmentId}
          appointmentDate={appointments.appointmentDate}
          setAppointmentDate={appointments.setAppointmentDate}
          startTime={appointments.startTime}
          setStartTime={appointments.setStartTime}
          notes={appointments.notes}
          setNotes={appointments.setNotes}
          saving={appointments.saving}
          notice={appointments.notice}
          onClose={() => appointments.setModalOpen(false)}
          onSubmit={appointments.handleCreateAppointment}
        />
      </div>
    </main>
  );
}
