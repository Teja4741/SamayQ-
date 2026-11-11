// Defines the data structures used across the appointments module.

export type Department = {
  id: string;
  name: string;
};

export type Doctor = {
  id: string;
  doctorId: string;
  name: string;
  departmentId: string | null;
  duration: number;
};

export type Patient = {
  id: string;
  full_name: string;
  phone: string | null;
};

export type Appointment = {
  id: string;
  patient_id: string;
  doctor_clinic_assignment_id: string | null;
  department_id: string | null;
  appointment_date: string;
  start_time: string;
  duration_minutes: number;
  status: string;
  booking_type: string;
  notes: string | null;
};

export type BookingMode = "doctor" | "department";

export type ViewMode = "day" | "week" | "month";