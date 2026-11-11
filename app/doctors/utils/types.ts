
/* =========================================
   DOCTOR STATUS TYPES
========================================= */

export type DoctorAvailabilityStatus = "available" | "away";

export type DoctorDisplayStatus = "on-screen" | "off-screen";

export type DoctorStatus = "Available" | "Away";

/* =========================================
   WEEK DAYS
========================================= */

export type WeekDay =
  | "Mon"
  | "Tue"
  | "Wed"
  | "Thu"
  | "Fri"
  | "Sat"
  | "Sun";

/* =========================================
   DOCTOR SCHEDULE
========================================= */

export type DoctorSchedule = {
  workingDays: WeekDay[];
  startTime: string;
  endTime: string;
};

/* =========================================
   DOCTOR
========================================= */

export type Doctor = {
  id: string;
  assignmentId: string;

  name: string;

  consultationDuration: number;
  patientsAtOnce: number;
  consultationPrice: number;

  // Token prefix configured for this doctor's clinic assignment.
  // Example: S, RUB, DOC1
  tokenPrefix: string;

  workingDays: WeekDay[];
  startTime: string;
  endTime: string;

  isOnScreen: boolean;
  availability: DoctorStatus;

  isActive: boolean;
};

/* =========================================
   ADD DOCTOR FORM DATA
========================================= */

export type AddDoctorFormData = {
  name: string;
  consultationDuration: number;
  patientsAtOnce: number;
  consultationPrice: number;
};

/* =========================================
   EDIT DOCTOR FORM DATA
========================================= */

export type EditDoctorFormData = {
  doctorId: string;
  assignmentId: string;

  name: string;

  consultationDuration: number;
  patientsAtOnce: number;
  consultationPrice: number;

  tokenPrefix: string;
};

/* =========================================
   ADD DOCTOR FORM PROPS
========================================= */

export type AddDoctorFormProps = {
  clinicId: string;
  onDoctorAdded: () => void;
};

/* =========================================
   DOCTOR LIST PROPS
========================================= */

export type DoctorListProps = {
  clinicId: string;
  doctors: Doctor[];
  onDoctorUpdated: () => void;
};

/* =========================================
   DOCTOR CARD PROPS
========================================= */

export type DoctorCardProps = {
  doctor: Doctor;

  onEdit: (doctor: Doctor) => void;

  onDelete: (assignmentId: string) => void;

  onAvailabilityChange: (
    assignmentId: string,
    status: DoctorAvailabilityStatus
  ) => void;

  onScreenChange: (
    assignmentId: string,
    isOnScreen: boolean
  ) => void;
};

/* =========================================
   EDIT DOCTOR MODAL PROPS
========================================= */

export type EditDoctorModalProps = {
  doctor: Doctor;
  onClose: () => void;
  onSave: (updatedDoctor: Doctor) => void;
};

/* =========================================
   DOCTOR AVAILABILITY PROPS
========================================= */

export type DoctorAvailabilityProps = {
  initialSchedule?: DoctorSchedule;
  onSave: (schedule: DoctorSchedule) => void;
  onCancel?: () => void;
};

/* =========================================
   DOCTOR ACTION RESULT
========================================= */

export type ActionResult<T = undefined> = {
  success: boolean;
  message: string;
  data?: T;
};

/* =========================================
   DOCTOR STATISTICS
========================================= */

export type DoctorStats = {
  total: number;
  active: number;
  inactive: number;
};
