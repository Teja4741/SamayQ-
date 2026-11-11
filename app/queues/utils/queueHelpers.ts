
import type {
  BookingMode,
  QueueFilter,
  QueuePatient,
  QueueStats,
  QueueStatus,
} from "../types/index";

// Get the correct filter label based on clinic booking mode.
export function getQueueFilterLabel(
  bookingMode: BookingMode
): string {
  return bookingMode === "department" ? "Department" : "Doctor";
}

// Create the Whole line filter.
export function getWholeLineFilter(): QueueFilter {
  return {
    id: "all",
    name: "Whole line",
    type: "all",
  };
}

// Filter patients by doctor or department.
export function filterQueuePatients(
  patients: QueuePatient[],
  filterId: string,
  bookingMode: BookingMode
): QueuePatient[] {
  if (filterId === "all") {
    return patients;
  }

  return patients.filter((patient) => {
    if (bookingMode === "doctor") {
      return patient.doctorId === filterId;
    }

    return patient.departmentId === filterId;
  });
}

// Filter patients by queue status.
export function filterByQueueStatus(
  patients: QueuePatient[],
  status: QueueStatus
): QueuePatient[] {
  return patients.filter((patient) => patient.status === status);
}

// Calculate Active, Missed and Done counts.
export function calculateQueueStats(
  patients: QueuePatient[]
): QueueStats {
  return {
    active: patients.filter(
      (patient) => patient.status === "active"
    ).length,

    missed: patients.filter(
      (patient) => patient.status === "missed"
    ).length,

    done: patients.filter(
      (patient) => patient.status === "done"
    ).length,
  };
}

// Format queue entry time.
export function formatQueueTime(
  date: string
): string {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Sort patients by queue joining time.
export function sortQueueByTime(
  patients: QueuePatient[]
): QueuePatient[] {
  return [...patients].sort(
    (a, b) =>
      new Date(a.joinedAt).getTime() -
      new Date(b.joinedAt).getTime()
  );
}
