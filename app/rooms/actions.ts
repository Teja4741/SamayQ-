
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

import type {
  BookingMode,
  CreateRoomInput,
  RoomDashboardData,
  RoomDashboardDepartment,
  RoomDashboardDoctor,
  RoomDashboardPatient,
  RoomDashboardRoom,
} from "./types";

// SamayQ business day starts at 3:00 AM India Standard Time.
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

  if (hour < 3) {
    businessDate.setUTCDate(businessDate.getUTCDate() - 1);
  }

  return businessDate.toISOString().slice(0, 10);
}

// --------------------------------------------------
// AUTHENTICATION AND ACCESS
// --------------------------------------------------

async function verifyUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Please sign in again.");
  }

  return { supabase, user };
}

async function verifyClinicAccess(clinicId: string) {
  const { supabase, user } = await verifyUser();

  const { data: platformAdmin, error: adminError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    throw new Error(adminError.message);
  }

  if (platformAdmin) return supabase;

  const { data: membership, error: membershipError } = await supabase
    .from("clinic_memberships")
    .select("clinic_id")
    .eq("clinic_id", clinicId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .in("role", ["administrator", "receptionist"])
    .maybeSingle();

  if (membershipError || !membership) {
    throw new Error("You do not have permission to manage this hospital.");
  }

  return supabase;
}

// --------------------------------------------------
// EXISTING ROOM FORM ACTIONS
// --------------------------------------------------

function getRoomFormValues(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const roomType = String(
    formData.get("room_type") ?? "consultation"
  ).trim();
  const departmentId = String(
    formData.get("department_id") ?? ""
  ).trim();
  const displayOrder = Number(formData.get("display_order") ?? 1);
  const clinicId = String(formData.get("clinicId") ?? "").trim();

  if (!name || !clinicId || !roomType) {
    throw new Error("Room information is incomplete.");
  }

  if (!Number.isInteger(displayOrder) || displayOrder < 1) {
    throw new Error("Display order must be a positive whole number.");
  }

  return {
    name,
    room_type: roomType,
    department_id: departmentId || null,
    display_order: displayOrder,
    clinic_id: clinicId,
  };
}

export async function createRoom(formData: FormData) {
  const values = getRoomFormValues(formData);
  const supabase = await verifyClinicAccess(values.clinic_id);

  const { error } = await supabase.from("rooms").insert(values);

  if (error) {
    throw new Error(`Unable to create room: ${error.message}`);
  }

  revalidatePath("/rooms");
}

export async function updateRoom(formData: FormData) {
  const values = getRoomFormValues(formData);
  const supabase = await verifyClinicAccess(values.clinic_id);

  const id = String(formData.get("id") ?? "").trim();

  if (!id) throw new Error("Room ID is required.");

  const { error } = await supabase
    .from("rooms")
    .update({
      name: values.name,
      room_type: values.room_type,
      department_id: values.department_id,
      display_order: values.display_order,
    })
    .eq("id", id)
    .eq("clinic_id", values.clinic_id);

  if (error) {
    throw new Error(`Unable to update room: ${error.message}`);
  }

  revalidatePath("/rooms");
}

export async function setRoomActive(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const clinicId = String(formData.get("clinicId") ?? "").trim();
  const activeValue = String(formData.get("is_active") ?? "");

  if (!id || !clinicId) {
    throw new Error("Room information is missing.");
  }

  if (!["true", "false"].includes(activeValue)) {
    throw new Error("Invalid room status.");
  }

  const supabase = await verifyClinicAccess(clinicId);

  const { error } = await supabase
    .from("rooms")
    .update({ is_active: activeValue === "true" })
    .eq("id", id)
    .eq("clinic_id", clinicId);

  if (error) {
    throw new Error(`Unable to update room: ${error.message}`);
  }

  revalidatePath("/rooms");
}

// --------------------------------------------------
// CREATE ROOM AND ITS OPTIONAL ASSIGNMENT
// --------------------------------------------------

export async function createClinicRoom(input: CreateRoomInput) {
  const name = input.name.trim();

  if (!input.clinicId || !name) {
    throw new Error("Hospital and room name are required.");
  }

  if (!Number.isInteger(input.displayOrder) || input.displayOrder < 1) {
    throw new Error("Invalid display order.");
  }

  const supabase = await verifyClinicAccess(input.clinicId);

  const { data: settings, error: settingsError } = await supabase
    .from("clinic_settings")
    .select("booking_mode")
    .eq("clinic_id", input.clinicId)
    .maybeSingle();

  if (settingsError) {
    throw new Error(settingsError.message);
  }

  const bookingMode: BookingMode =
    settings?.booking_mode === "doctor" ? "doctor" : "department";

  let departmentId: string | null = null;
  let doctorAssignmentId: string | null = null;

  if (input.assignmentId) {
    if (bookingMode === "doctor") {
      const { data: assignment, error } = await supabase
        .from("doctor_clinic_assignments")
        .select("id")
        .eq("id", input.assignmentId)
        .eq("clinic_id", input.clinicId)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !assignment) {
        throw new Error("The selected doctor is unavailable.");
      }

      doctorAssignmentId = assignment.id;
    } else {
      const { data: department, error } = await supabase
        .from("departments")
        .select("id")
        .eq("id", input.assignmentId)
        .eq("clinic_id", input.clinicId)
        .maybeSingle();

      if (error || !department) {
        throw new Error("The selected department is unavailable.");
      }

      departmentId = department.id;
    }
  }

  // Create the room.
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({
      clinic_id: input.clinicId,
      name,
      room_type: input.roomType,
      department_id: departmentId,
      display_order: input.displayOrder,
      is_active: true,
    })
    .select("id")
    .single();

  if (roomError || !room) {
    throw new Error(
      `Unable to create room: ${roomError?.message ?? "No room returned."}`
    );
  }

  // Create its path. The database constraint allows only one owner type.
  const { data: path, error: pathError } = await supabase
    .from("room_paths")
    .insert({
      clinic_id: input.clinicId,
      name: `${name} Path`,
      description: input.assignmentId
        ? `Room path for ${bookingMode} assignment`
        : "Shared room path",
      department_id: departmentId,
      doctor_clinic_assignment_id: doctorAssignmentId,
      is_active: true,
    })
    .select("id")
    .single();

  if (pathError || !path) {
    // Roll back the room if its path could not be created.
    await supabase
      .from("rooms")
      .delete()
      .eq("id", room.id)
      .eq("clinic_id", input.clinicId);

    throw new Error(
      `Unable to create room path: ${pathError?.message ?? "No path returned."}`
    );
  }

  // Add the room as the first step of its path.
  const { error: stepError } = await supabase
    .from("room_path_steps")
    .insert({
      clinic_id: input.clinicId,
      room_path_id: path.id,
      room_id: room.id,
      step_order: 1,
      is_active: true,
    });

  if (stepError) {
    // Clean up partially created records.
    await supabase
      .from("room_paths")
      .delete()
      .eq("id", path.id)
      .eq("clinic_id", input.clinicId);

    await supabase
      .from("rooms")
      .delete()
      .eq("id", room.id)
      .eq("clinic_id", input.clinicId);

    throw new Error(
      `Unable to connect room to its path: ${stepError.message}`
    );
  }

  revalidatePath("/rooms");
  return { success: true, roomId: room.id };
}

// --------------------------------------------------
// ROOM DASHBOARD DATA
// --------------------------------------------------

export async function getClinicRoomsDashboardData(
  clinicId: string
): Promise<RoomDashboardData> {
  if (!clinicId) {
    throw new Error("Clinic ID is required.");
  }

  const supabase = await verifyClinicAccess(clinicId);

  // Booking mode.
  const { data: settings, error: settingsError } = await supabase
    .from("clinic_settings")
    .select("booking_mode")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (settingsError) {
    throw new Error(settingsError.message);
  }

  const bookingMode: BookingMode =
    settings?.booking_mode === "doctor" ? "doctor" : "department";

  // Rooms.
  const { data: roomRows, error: roomsError } = await supabase
    .from("rooms")
    .select("id, name, room_type, department_id, display_order")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("display_order");

  if (roomsError) throw new Error(roomsError.message);

  // Departments.
  const { data: departmentRows, error: departmentsError } =
    await supabase
      .from("departments")
      .select("id, name")
      .eq("clinic_id", clinicId)
      .order("name");

  if (departmentsError) throw new Error(departmentsError.message);

  // Doctor assignments.
  const { data: assignmentRows, error: assignmentsError } =
    await supabase
      .from("doctor_clinic_assignments")
      .select("id, doctor_id, department_id")
      .eq("clinic_id", clinicId)
      .eq("is_active", true);

  if (assignmentsError) throw new Error(assignmentsError.message);

  const assignmentRowsSafe = assignmentRows ?? [];
  const doctorIds = [
    ...new Set(assignmentRowsSafe.map((item) => item.doctor_id)),
  ];

  const { data: doctorRows, error: doctorsError } =
    doctorIds.length > 0
      ? await supabase
          .from("doctors")
          .select("id, full_name")
          .in("id", doctorIds)
      : { data: [], error: null };

  if (doctorsError) throw new Error(doctorsError.message);

  const doctorMap = new Map(
    (doctorRows ?? []).map((doctor) => [
      doctor.id,
      doctor.full_name,
    ])
  );

  const assignmentMap = new Map(
    assignmentRowsSafe.map((assignment) => [
      assignment.id,
      {
        ...assignment,
        doctorName: doctorMap.get(assignment.doctor_id) ?? "Unknown Doctor",
      },
    ])
  );

  // Room paths and steps.
  const { data: paths, error: pathsError } = await supabase
    .from("room_paths")
    .select("id, department_id, doctor_clinic_assignment_id")
    .eq("clinic_id", clinicId)
    .eq("is_active", true);

  if (pathsError) throw new Error(pathsError.message);

  const pathIds = (paths ?? []).map((path) => path.id);

  const { data: steps, error: stepsError } =
    pathIds.length > 0
      ? await supabase
          .from("room_path_steps")
          .select("room_path_id, room_id")
          .eq("clinic_id", clinicId)
          .eq("is_active", true)
          .in("room_path_id", pathIds)
      : { data: [], error: null };

  if (stepsError) throw new Error(stepsError.message);

  const pathMap = new Map(
    (paths ?? []).map((path) => [path.id, path])
  );

  const roomAssignmentMap = new Map<
    string,
    { departmentId: string | null; doctorAssignmentId: string | null }
  >();

  for (const step of steps ?? []) {
    const path = pathMap.get(step.room_path_id);
    if (!path) continue;

    roomAssignmentMap.set(step.room_id, {
      departmentId: path.department_id,
      doctorAssignmentId: path.doctor_clinic_assignment_id,
    });
  }

  // Active queues.
  const { data: queueRows, error: queuesError } = await supabase
    .from("queues")
    .select(
      "id, department_id, doctor_clinic_assignment_id, token_prefix"
    )
    .eq("clinic_id", clinicId)
    .eq("is_active", true);

  if (queuesError) throw new Error(queuesError.message);

  const queueRowsSafe = queueRows ?? [];
  const queueIds = queueRowsSafe.map((queue) => queue.id);

  // Only show room entries belonging to the current 3:00 AM-to-3:00 AM business day.
  const businessDate = getCurrentBusinessDate();

  const { data: entries, error: entriesError } =
    queueIds.length > 0
      ? await supabase
          .from("queue_entries")
          .select(
            "id, queue_id, patient_id, entry_type, token_number, status, joined_at, current_room_id"
          )
          .in("queue_id", queueIds)
          .eq("business_date", businessDate)
          .not("current_room_id", "is", null)
          .in("status", ["active", "missed"])
          .order("joined_at", { ascending: true })
      : { data: [], error: null };

  if (entriesError) throw new Error(entriesError.message);

  const entryRows = entries ?? [];
  const patientIds = [
    ...new Set(entryRows.map((entry) => entry.patient_id)),
  ];

  const { data: patients, error: patientsError } =
    patientIds.length > 0
      ? await supabase
          .from("patients")
          .select("id, full_name, phone")
          .eq("clinic_id", clinicId)
          .in("id", patientIds)
      : { data: [], error: null };

  if (patientsError) throw new Error(patientsError.message);

  const patientMap = new Map(
    (patients ?? []).map((patient) => [patient.id, patient])
  );

  const queueMap = new Map(
    queueRowsSafe.map((queue) => [queue.id, queue])
  );

  const departmentMap = new Map(
    (departmentRows ?? []).map((department) => [
      department.id,
      department.name,
    ])
  );

  const rooms: RoomDashboardRoom[] = (roomRows ?? []).map((room) => {
    const assignment = roomAssignmentMap.get(room.id);
    const doctorAssignment = assignment?.doctorAssignmentId
      ? assignmentMap.get(assignment.doctorAssignmentId)
      : null;

    return {
      id: room.id,
      name: room.name,
      roomType: room.room_type,
      departmentId: room.department_id ?? assignment?.departmentId ?? null,
      doctorAssignmentId: assignment?.doctorAssignmentId ?? null,
      doctorName: doctorAssignment?.doctorName ?? null,
      displayOrder: room.display_order,
      patients: [],
    };
  });

  const roomMap = new Map(rooms.map((room) => [room.id, room]));

  for (const entry of entryRows) {
    const room = entry.current_room_id
      ? roomMap.get(entry.current_room_id)
      : undefined;

    const patient = patientMap.get(entry.patient_id);
    const queue = queueMap.get(entry.queue_id);

    if (!room || !patient || !queue) continue;

    const queueAssignment = queue.doctor_clinic_assignment_id
      ? assignmentMap.get(queue.doctor_clinic_assignment_id)
      : null;

    const departmentId =
      queue.department_id ??
      queueAssignment?.department_id ??
      room.departmentId;

    const doctorAssignmentId =
      queue.doctor_clinic_assignment_id ??
      room.doctorAssignmentId;

    const doctor = doctorAssignmentId
      ? assignmentMap.get(doctorAssignmentId)
      : null;

    const row: RoomDashboardPatient = {
      queueEntryId: entry.id,
      patientId: patient.id,
      queueId: entry.queue_id,
      roomId: room.id,
      tokenNumber: `${queue.token_prefix ?? ""}${entry.token_number}`,
      patientName: patient.full_name,
      phone: patient.phone ?? "",
      departmentId,
      departmentName: departmentId
        ? departmentMap.get(departmentId) ?? "Other"
        : "—",
      doctorAssignmentId,
      doctorName: doctor?.doctorName ?? "—",
      status: entry.status as "active" | "missed",
      joinedAt: entry.joined_at,
      entryType:
        entry.entry_type === "appointment" ? "appointment" : "walk_in",
    };

    room.patients.push(row);
  }

  const departments: RoomDashboardDepartment[] = (
    departmentRows ?? []
  ).map((department) => ({
    id: department.id,
    name: department.name,
    patientCount: rooms.reduce(
      (count, room) =>
        count +
        room.patients.filter(
          (patient) => patient.departmentId === department.id
        ).length,
      0
    ),
  }));

  const doctors: RoomDashboardDoctor[] = assignmentRowsSafe.map(
    (assignment) => {
      const doctor = assignmentMap.get(assignment.id);

      return {
        id: assignment.id,
        name: doctor?.doctorName ?? "Unknown Doctor",
        departmentId: assignment.department_id,
        patientCount: rooms.reduce(
          (count, room) =>
            count +
            room.patients.filter(
              (patient) =>
                patient.doctorAssignmentId === assignment.id
            ).length,
          0
        ),
      };
    }
  );

  return {
    bookingMode,
    rooms,
    departments,
    doctors,
    totalRooms: rooms.length,
    totalPatients: rooms.reduce(
      (count, room) => count + room.patients.length,
      0
    ),
  };
}

// --------------------------------------------------
// CALL PATIENT
// --------------------------------------------------

export async function callRoomPatient(queueEntryId: string) {
  if (!queueEntryId) {
    throw new Error("Queue entry ID is required.");
  }

  const { supabase } = await verifyUser();

  const { data, error } = await supabase.rpc("manage_queue_entry", {
    p_queue_entry_id: queueEntryId,
    p_action: "call",
  });

  if (error) throw new Error(error.message);

  if (!data || data.success !== true) {
    throw new Error(data?.error || "Unable to call this patient.");
  }

  revalidatePath("/rooms");
  revalidatePath("/queues");

  return data;
}


// --------------------------------------------------
// TRANSFER PATIENT TO ANOTHER ROOM
// --------------------------------------------------

export async function transferRoomPatient(
  queueEntryId: string,
  destinationRoomId: string
) {
  if (!queueEntryId || !destinationRoomId) {
    throw new Error("Patient and destination room are required.");
  }

  const { supabase } = await verifyUser();

  const { data, error } = await supabase.rpc(
    "transfer_queue_entry_room",
    {
      p_queue_entry_id: queueEntryId,
      p_destination_room_id: destinationRoomId,
    }
  );

  if (error) {
    console.error("Room transfer error:", error);
    throw new Error(error.message);
  }

  if (!data || data.success !== true) {
    throw new Error(
      data?.error || "Unable to transfer this patient."
    );
  }

  revalidatePath("/rooms");
  revalidatePath("/queues");

  return data;
}
