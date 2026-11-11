
export type BookingMode = "doctor" | "department";

export type QueueType = "walk_in" | "appointment";

export type QueueStatus = "active" | "missed" | "done";

export type QueueFilter = {
  id: string;
  name: string;
  type: BookingMode | "all";
};

export type Patient = {
  id: string;
  full_name: string;
  phone: string;
};

export type QueueEntry = {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  entry_type: string;
  joined_at: string;
  current_room_id: string | null;
};

export type QueuePatient = {
  id: string;
  patientId: string;
  name: string;
  phone: string;
  tokenNumber?: string;
  type: QueueType;
  status: QueueStatus;
  doctorId?: string | null;
  departmentId?: string | null;
  roomName?: string | null;
  joinedAt: string;
};

export type QueueStats = {
  active: number;
  missed: number;
  done: number;
};

export type ClinicQueueConfig = {
  clinicId: string;
  bookingMode: BookingMode;
  clinicName: string;
};

export type QueueActionResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

// Doctor dropdown option.
export type QueueDoctorOption = {
  id: string;
  name: string;
};

// Department dropdown option.
export type QueueDepartmentOption = {
  id: string;
  name: string;
};

// Options passed from the server to the Add Patient form.
export type QueueFormOptions = {
  doctors: QueueDoctorOption[];
  departments: QueueDepartmentOption[];
};
