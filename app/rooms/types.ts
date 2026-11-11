
export type BookingMode = "doctor" | "department";

export type RoomAssignmentOption = {
  id: string;
  name: string;
  departmentId?: string | null;
};

export type RoomDashboardPatient = {
  queueEntryId: string;
  patientId: string;
  queueId: string;
  roomId: string;
  tokenNumber: string;
  patientName: string;
  phone: string;
  departmentId: string | null;
  departmentName: string;
  doctorAssignmentId: string | null;
  doctorName: string;
  status: "active" | "missed";
  joinedAt: string;
  entryType: "walk_in" | "appointment";
};

export type RoomDashboardRoom = {
  id: string;
  name: string;
  roomType: string;
  departmentId: string | null;
  doctorAssignmentId: string | null;
  doctorName: string | null;
  displayOrder: number;
  patients: RoomDashboardPatient[];
};

export type RoomDashboardDepartment = {
  id: string;
  name: string;
  patientCount: number;
};

export type RoomDashboardDoctor = {
  id: string;
  name: string;
  departmentId: string | null;
  patientCount: number;
};

export type RoomDashboardData = {
  bookingMode: BookingMode;
  rooms: RoomDashboardRoom[];
  departments: RoomDashboardDepartment[];
  doctors: RoomDashboardDoctor[];
  totalRooms: number;
  totalPatients: number;
};

export type CreateRoomInput = {
  clinicId: string;
  name: string;
  roomType: string;
  displayOrder: number;
  assignmentId: string | null;
};
