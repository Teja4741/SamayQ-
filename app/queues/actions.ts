
"use server";

import { createClient } from "@/lib/supabase/server";

import type {
  BookingMode,
  QueueFilter,
  QueuePatient,
  QueueStats,
  QueueStatus,
  QueueType,
  QueueFormOptions,
} from "./types/index";

import { calculateQueueStats } from "./utils/queueHelpers";

type QueuePatientWithQueueId = QueuePatient & {
  queueId: string;
  tokenNumber: string;
};

type QueueDataResult = {
  bookingMode: BookingMode;
  filters: QueueFilter[];
  patients: QueuePatientWithQueueId[];
  stats: QueueStats;
};

// Convert database status into the frontend status.
function normalizeStatus(status: string): QueueStatus {
  if (status === "missed") return "missed";

  if (status === "completed" || status === "done") {
    return "done";
  }

  return "active";
}

// Convert database entry type into frontend entry type.
function normalizeQueueType(entryType: string): QueueType {
  return entryType === "appointment" ? "appointment" : "walk_in";
}

// Get the current business date for SamayQ queues.
// The business day starts at 3:00 AM India Standard Time.
function getCurrentBusinessDate(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  const hour = Number(values.hour);

  const businessDate = new Date(Date.UTC(year, month - 1, day));

  // Before 3:00 AM IST, the previous business date is still active.
  if (hour < 3) {
    businessDate.setUTCDate(businessDate.getUTCDate() - 1);
  }

  return businessDate.toISOString().slice(0, 10);
}

// --------------------------------------------------
// QUEUE READ ACCESS
// --------------------------------------------------

// Administrators and receptionists can see all queues.
// Doctors can only see queues linked to their own doctor profile.
async function verifyQueueReadAccess(clinicId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please sign in again.");
  }

  // Platform administrators can view all clinic queues.
  const { data: platformAdmin, error: adminError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    throw new Error(adminError.message);
  }

  if (platformAdmin) {
    return {
      supabase,
      doctorAssignmentIds: null as string[] | null,
    };
  }

  // Verify active clinic membership.
  const { data: membership, error: membershipError } = await supabase
    .from("clinic_memberships")
    .select("role")
    .eq("clinic_id", clinicId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership) {
    throw new Error("You do not have access to this hospital.");
  }

  // Administrators and receptionists can view all queues.
  if (
    membership.role === "administrator" ||
    membership.role === "receptionist"
  ) {
    return {
      supabase,
      doctorAssignmentIds: null as string[] | null,
    };
  }

  if (membership.role !== "doctor") {
    throw new Error("You are not authorized to view this queue.");
  }

  // Find the doctor profile linked to this login.
  const { data: doctor, error: doctorError } = await supabase
    .from("doctors")
    .select("id")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (doctorError) {
    throw new Error(doctorError.message);
  }

  if (!doctor) {
    throw new Error("No doctor profile is linked to your account.");
  }

  // Find this doctor's active assignment(s) in this clinic.
  const { data: assignments, error: assignmentsError } = await supabase
    .from("doctor_clinic_assignments")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("doctor_id", doctor.id)
    .eq("is_active", true);

  if (assignmentsError) {
    throw new Error(assignmentsError.message);
  }

  return {
    supabase,
    doctorAssignmentIds: (assignments ?? []).map(
      (assignment) => assignment.id
    ),
  };
}

// --------------------------------------------------
// GET QUEUE DATA
// --------------------------------------------------

export async function getClinicQueueData(
  clinicId: string
): Promise<QueueDataResult> {
  if (!clinicId) {
    throw new Error("Clinic ID is required.");
  }

  const { supabase, doctorAssignmentIds } =
    await verifyQueueReadAccess(clinicId);

  // 1. Load clinic booking mode.
  const {
    data: settings,
    error: settingsError,
  } = await supabase
    .from("clinic_settings")
    .select("booking_mode")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (settingsError) {
    throw new Error(
      `Unable to load clinic settings: ${settingsError.message}`
    );
  }

  const bookingMode: BookingMode =
    settings?.booking_mode === "department"
      ? "department"
      : "doctor";

  // 2. Load active queues.
  const {
    data: queues,
    error: queuesError,
  } = await supabase
    .from("queues")
    .select(
      "id, name, department_id, doctor_clinic_assignment_id, token_prefix"
    )
    .eq("clinic_id", clinicId)
    .eq("is_active", true);

  if (queuesError) {
    throw new Error(
      `Unable to load queues: ${queuesError.message}`
    );
  }

  const allQueueRows = queues ?? [];

  // Restrict doctor accounts to queues assigned to their doctor profile.
  const queueRows =
    doctorAssignmentIds === null
      ? allQueueRows
      : allQueueRows.filter(
          (queue) =>
            queue.doctor_clinic_assignment_id !== null &&
            doctorAssignmentIds.includes(
              queue.doctor_clinic_assignment_id
            )
        );

  const queueIds = queueRows.map((queue) => queue.id);

  // 3. Load queue entries for the current business day.
  const businessDate = getCurrentBusinessDate();

  const {
    data: entries,
    error: entriesError,
  } =
    queueIds.length > 0
      ? await supabase
          .from("queue_entries")
          .select(
            "id, queue_id, patient_id, appointment_id, entry_type, token_number, status, joined_at, current_room_id"
          )
          .in("queue_id", queueIds)
          .eq("business_date", businessDate)
          .order("joined_at", { ascending: true })
      : {
          data: [],
          error: null,
        };

  if (entriesError) {
    throw new Error(
      `Unable to load queue entries: ${entriesError.message}`
    );
  }

  const entryRows = entries ?? [];

  // 4. Load patient details.
  const patientIds = [
    ...new Set(entryRows.map((entry) => entry.patient_id)),
  ];

  const {
    data: patientRows,
    error: patientsError,
  } =
    patientIds.length > 0
      ? await supabase
          .from("patients")
          .select("id, full_name, phone")
          .eq("clinic_id", clinicId)
          .in("id", patientIds)
      : {
          data: [],
          error: null,
        };

  if (patientsError) {
    throw new Error(
      `Unable to load patients: ${patientsError.message}`
    );
  }

  const patientMap = new Map(
    (patientRows ?? []).map((patient) => [
      patient.id,
      patient,
    ])
  );

  // 5. Load doctor-clinic assignments.
  // Inactive assignments are retained for historical queue mapping.
  const {
    data: assignments,
    error: assignmentsError,
  } = await supabase
    .from("doctor_clinic_assignments")
    .select("id, doctor_id, department_id, is_active")
    .eq("clinic_id", clinicId);

  if (assignmentsError) {
    throw new Error(
      `Unable to load doctor assignments: ${assignmentsError.message}`
    );
  }

  const allAssignmentRows = assignments ?? [];

  // Keep all assignments for administrators/receptionists.
  // Doctors only receive their own assignments.
  const assignmentRows =
    doctorAssignmentIds === null
      ? allAssignmentRows
      : allAssignmentRows.filter((assignment) =>
          doctorAssignmentIds.includes(assignment.id)
        );

  // Only active assignments appear in selectable doctor filters.
  const activeAssignmentRows = assignmentRows.filter(
    (assignment) => assignment.is_active === true
  );

  // Keep all visible assignments for existing queue-entry mapping.
  const assignmentMap = new Map(
    assignmentRows.map((assignment) => [
      assignment.id,
      assignment,
    ])
  );

  // 6. Load doctor names.
  const doctorIds = [
    ...new Set(
      assignmentRows.map((assignment) => assignment.doctor_id)
    ),
  ];

  const {
    data: doctors,
    error: doctorsError,
  } =
    doctorIds.length > 0
      ? await supabase
          .from("doctors")
          .select("id, full_name")
          .in("id", doctorIds)
      : {
          data: [],
          error: null,
        };

  if (doctorsError) {
    throw new Error(
      `Unable to load doctors: ${doctorsError.message}`
    );
  }

  const doctorMap = new Map(
    (doctors ?? []).map((doctor) => [
      doctor.id,
      doctor.full_name,
    ])
  );

  // 7. Load active clinic departments.
  const {
    data: departments,
    error: departmentsError,
  } = await supabase
    .from("departments")
    .select("id, name")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("name");

  if (departmentsError) {
    throw new Error(
      `Unable to load departments: ${departmentsError.message}`
    );
  }

  const departmentRows = departments ?? [];

  // 8. Load room names used by current queue entries.
  const roomIds = [
    ...new Set(
      entryRows
        .map((entry) => entry.current_room_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const {
    data: rooms,
    error: roomsError,
  } =
    roomIds.length > 0
      ? await supabase
          .from("rooms")
          .select("id, name")
          .eq("clinic_id", clinicId)
          .in("id", roomIds)
      : {
          data: [],
          error: null,
        };

  if (roomsError) {
    throw new Error(
      `Unable to load rooms: ${roomsError.message}`
    );
  }

  const roomMap = new Map(
    (rooms ?? []).map((room) => [
      room.id,
      room.name,
    ])
  );

  // 9. Build doctor / department filters.
  const filters: QueueFilter[] = [
    {
      id: "all",
      name:
        bookingMode === "doctor"
          ? "All Doctors"
          : "All Departments",
      type: "all",
    },
  ];

  if (bookingMode === "doctor") {
    for (const assignment of activeAssignmentRows) {
      const doctorName = doctorMap.get(assignment.doctor_id);

      if (!doctorName) continue;

      filters.push({
        id: assignment.id,
        name: doctorName,
        type: "doctor",
      });
    }
  } else {
    for (const department of departmentRows) {
      filters.push({
        id: department.id,
        name: department.name,
        type: "department",
      });
    }
  }

  // 10. Build queue lookup using only queues visible to this user.
  const queueMap = new Map(
    queueRows.map((queue) => [
      queue.id,
      queue,
    ])
  );

  // 11. Convert database entries into frontend QueuePatient objects.
  const mappedPatients: (
    | QueuePatientWithQueueId
    | null
  )[] = entryRows.map((entry) => {
    const patient = patientMap.get(entry.patient_id);
    const queue = queueMap.get(entry.queue_id);

    if (!patient || !queue) {
      return null;
    }

    // Use all visible assignments, including inactive ones,
    // to preserve historical queue-entry mapping.
    const assignment = queue.doctor_clinic_assignment_id
      ? assignmentMap.get(queue.doctor_clinic_assignment_id)
      : null;

    const departmentId =
      queue.department_id ??
      assignment?.department_id ??
      null;

    return {
      id: entry.id,
      queueId: entry.queue_id,
      patientId: patient.id,

      name: patient.full_name,
      phone: patient.phone,

      tokenNumber: `${queue.token_prefix ?? ""}${entry.token_number}`,

      type: normalizeQueueType(entry.entry_type),
      status: normalizeStatus(entry.status),

      // This field stores the doctor-clinic assignment ID.
      // It matches the ID used by doctor filters.
      doctorId: queue.doctor_clinic_assignment_id,

      departmentId,

      roomName: entry.current_room_id
        ? roomMap.get(entry.current_room_id) ?? null
        : null,

      joinedAt: entry.joined_at,
    };
  });

  const patients: QueuePatientWithQueueId[] =
    mappedPatients.filter(
      (
        patient
      ): patient is QueuePatientWithQueueId =>
        patient !== null
    );

  // 12. Return queue data.
  return {
    bookingMode,
    filters,
    patients,
    stats: calculateQueueStats(patients),
  };
}

// --------------------------------------------------
// QUEUE FORM OPTIONS
// --------------------------------------------------

export async function getClinicQueueFormOptions(
  clinicId: string
): Promise<QueueFormOptions> {
  if (!clinicId) {
    throw new Error("Clinic ID is required.");
  }

  const { supabase, doctorAssignmentIds } =
    await verifyQueueReadAccess(clinicId);

  // Load active doctor assignments for this clinic.
  const {
    data: assignments,
    error: assignmentError,
  } = await supabase
    .from("doctor_clinic_assignments")
    .select("id, doctor_id")
    .eq("clinic_id", clinicId)
    .eq("is_active", true);

  if (assignmentError) {
    throw new Error(
      `Unable to load clinic doctors: ${assignmentError.message}`
    );
  }

  // Doctors receive only their own assignment options.
  const assignmentRows = (assignments ?? []).filter(
    (assignment) =>
      doctorAssignmentIds === null ||
      doctorAssignmentIds.includes(assignment.id)
  );

  const doctorIds = [
    ...new Set(
      assignmentRows.map((item) => item.doctor_id)
    ),
  ];

  // Load doctor names.
  const {
    data: doctors,
    error: doctorsError,
  } =
    doctorIds.length > 0
      ? await supabase
          .from("doctors")
          .select("id, full_name")
          .in("id", doctorIds)
      : {
          data: [],
          error: null,
        };

  if (doctorsError) {
    throw new Error(
      `Unable to load doctors: ${doctorsError.message}`
    );
  }

  const doctorMap = new Map(
    (doctors ?? []).map((doctor) => [
      doctor.id,
      doctor.full_name,
    ])
  );

  const doctorOptions = assignmentRows
    .map((assignment) => ({
      id: assignment.id,
      name: doctorMap.get(assignment.doctor_id) ?? "",
    }))
    .filter((doctor) => doctor.name.trim() !== "");

  // Load active departments.
  const {
    data: departments,
    error: departmentsError,
  } = await supabase
    .from("departments")
    .select("id, name")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("name");

  if (departmentsError) {
    throw new Error(
      `Unable to load departments: ${departmentsError.message}`
    );
  }

  return {
    doctors: doctorOptions,
    departments: (departments ?? []).map((department) => ({
      id: department.id,
      name: department.name,
    })),
  };
}

// --------------------------------------------------
// REGISTER WALK-IN PATIENT
// --------------------------------------------------

export async function registerWalkInPatient(data: {
  clinicId: string;
  patientId: string | null;
  patientName: string;
  phone: string;
  doctorAssignmentId: string | null;
  departmentId: string | null;
}) {
  if (!data.clinicId) {
    throw new Error("Clinic ID is required.");
  }

  if (!data.patientName.trim()) {
    throw new Error("Patient name is required.");
  }

  if (!data.phone.trim()) {
    throw new Error("Patient phone number is required.");
  }

  if (
    (!data.doctorAssignmentId && !data.departmentId) ||
    (data.doctorAssignmentId && data.departmentId)
  ) {
    throw new Error(
      "Please select either a doctor or department."
    );
  }

  const supabase = await createClient();

  const {
    data: result,
    error,
  } = await supabase.rpc("register_walk_in_patient", {
    p_clinic_id: data.clinicId,
    p_patient_id: data.patientId,
    p_patient_name: data.patientName.trim(),
    p_phone: data.phone.trim(),
    p_doctor_assignment_id: data.doctorAssignmentId,
    p_department_id: data.departmentId,
  });

  if (error) {
    console.error("Walk-in registration error:", error);
    throw new Error(error.message);
  }

  if (!result || result.success !== true) {
    throw new Error(
      result?.error || "Unable to register the patient."
    );
  }

  return result as {
    success: boolean;
    patient_id: string;
    queue_id: string;
    token_number: number;
    token: string;
  };
}

// --------------------------------------------------
// MANAGE QUEUE ENTRY
// --------------------------------------------------

export type QueueManagementAction =
  | "call"
  | "miss"
  | "return_to_line"
  | "complete"
  | "remove";

export async function manageQueueEntry(
  queueEntryId: string,
  action: QueueManagementAction
) {
  if (!queueEntryId) {
    throw new Error("Queue entry ID is required.");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please sign in again.");
  }

  const { data, error } = await supabase.rpc(
    "manage_queue_entry",
    {
      p_queue_entry_id: queueEntryId,
      p_action: action,
    }
  );

  if (error) {
    console.error("Queue action error:", error);
    throw new Error(error.message);
  }

  if (!data || data.success !== true) {
    throw new Error(
      data?.error || "Unable to update the queue."
    );
  }

  return data;
}

// --------------------------------------------------
// GET ACTIVE ROOMS FOR PATIENT TRANSFER
// --------------------------------------------------

export async function getClinicActiveRooms(clinicId: string) {
  if (!clinicId) {
    throw new Error("Clinic ID is required.");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please sign in again.");
  }

  const { data: rooms, error } = await supabase
    .from("rooms")
    .select("id, name")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error(
      `Unable to load active rooms: ${error.message}`
    );
  }

  return rooms ?? [];
}
