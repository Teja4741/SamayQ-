
"use server";

import { createClient } from "@/lib/supabase/server";

export type PatientRow = {
  id: string;
  name: string;
  phone: string;
  type: "Walk-in" | "Reserved" | "Mixed";
  rooms: string[];
  visits: number;
  noShows: number;
  lastSeen: string | null;
};

type QueueEntry = {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  entry_type: string;
  joined_at: string;
  current_room_id: string | null;
};

type QueueEvent = {
  queue_entry_id: string;
  related_queue_entry_id: string | null;
  event_type: string;
  room_id: string | null;
};

type Appointment = {
  id: string;
  patient_id: string;
  appointment_date: string;
  status: string;
};

export async function getPatients(
  clinicId: string
): Promise<{
  success: boolean;
  patients: PatientRow[];
  error?: string;
}> {
  try {
    if (!clinicId) {
      return {
        success: false,
        patients: [],
        error: "A clinic must be selected.",
      };
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        patients: [],
        error: "Please sign in again.",
      };
    }

    const { data: platformAdmin, error: adminError } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminError) throw adminError;

    if (!platformAdmin) {
      const { data: membership, error: membershipError } = await supabase
        .from("clinic_memberships")
        .select("clinic_id, role")
        .eq("user_id", user.id)
        .eq("clinic_id", clinicId)
        .eq("is_active", true)
        .in("role", ["administrator", "receptionist", "doctor"])
        .maybeSingle();

      if (membershipError) throw membershipError;

      if (!membership) {
        return {
          success: false,
          patients: [],
          error: "You do not have access to this clinic.",
        };
      }
    } else {
      const { data: clinic, error: clinicError } = await supabase
        .from("clinics")
        .select("id")
        .eq("id", clinicId)
        .maybeSingle();

      if (clinicError) throw clinicError;

      if (!clinic) {
        return {
          success: false,
          patients: [],
          error: "Clinic not found.",
        };
      }
    }

    // Load patients belonging to this clinic.
    const { data: patientData, error: patientError } = await supabase
      .from("patients")
      .select("id, full_name, phone")
      .eq("clinic_id", clinicId)
      .order("full_name", { ascending: true });

    if (patientError) throw patientError;

    const patients = patientData ?? [];

    if (patients.length === 0) {
      return {
        success: true,
        patients: [],
      };
    }

    const patientIds = patients.map((patient) => patient.id);

    // Load queues belonging to this clinic.
    const { data: queueData, error: queueError } = await supabase
      .from("queues")
      .select("id")
      .eq("clinic_id", clinicId);

    if (queueError) throw queueError;

    const queueIds = (queueData ?? []).map((queue) => queue.id);

    // Load rooms belonging to this clinic.
    const { data: roomData, error: roomError } = await supabase
      .from("rooms")
      .select("id, name")
      .eq("clinic_id", clinicId);

    if (roomError) throw roomError;

    const roomNames = new Map(
      (roomData ?? []).map((room) => [room.id, room.name])
    );

    let entries: QueueEntry[] = [];

    if (queueIds.length > 0) {
      const { data, error } = await supabase
        .from("queue_entries")
        .select(
          "id, patient_id, appointment_id, entry_type, joined_at, current_room_id"
        )
        .in("queue_id", queueIds)
        .in("patient_id", patientIds)
        .order("joined_at", { ascending: false });

      if (error) throw error;

      entries = (data ?? []) as QueueEntry[];
    }

    // Load appointments for patients in this clinic.
    const { data: appointmentData, error: appointmentError } =
      await supabase
        .from("appointments")
        .select("id, patient_id, appointment_date, status")
        .eq("clinic_id", clinicId)
        .in("patient_id", patientIds);

    if (appointmentError) throw appointmentError;

    const appointments = (appointmentData ?? []) as Appointment[];

    // Load queue events for the entries in this clinic.
    let events: QueueEvent[] = [];

    if (entries.length > 0) {
      const entryIds = entries.map((entry) => entry.id);

      const { data, error } = await supabase
        .from("queue_events")
        .select(
          "queue_entry_id, related_queue_entry_id, event_type, room_id"
        )
        .in("queue_entry_id", entryIds);

      if (error) throw error;

      events = (data ?? []) as QueueEvent[];
    }

    // Group entries linked by transfer events into one visit.
    const parent = new Map<string, string>();

    function find(id: string): string {
      const current = parent.get(id);

      if (!current) {
        parent.set(id, id);
        return id;
      }

      if (current === id) return id;

      const root = find(current);
      parent.set(id, root);
      return root;
    }

    function union(first: string, second: string) {
      const firstRoot = find(first);
      const secondRoot = find(second);

      if (firstRoot !== secondRoot) {
        parent.set(secondRoot, firstRoot);
      }
    }

    entries.forEach((entry) => find(entry.id));

    events.forEach((event) => {
      if (
        event.related_queue_entry_id &&
        [
          "doctor_transferred",
          "department_transferred",
          "referred",
        ].includes(event.event_type)
      ) {
        if (
          parent.has(event.related_queue_entry_id) &&
          parent.has(event.queue_entry_id)
        ) {
          union(event.queue_entry_id, event.related_queue_entry_id);
        }
      }
    });

    const result: PatientRow[] = patients.map((patient) => {
      const patientEntries = entries.filter(
        (entry) => entry.patient_id === patient.id
      );

      const patientAppointments = appointments.filter(
        (appointment) => appointment.patient_id === patient.id
      );

      const patientEvents = events.filter((event) =>
        patientEntries.some((entry) => entry.id === event.queue_entry_id)
      );

      const visitGroups = new Map<
        string,
        {
          entryTypes: Set<string>;
          latestDate: string;
        }
      >();

      patientEntries.forEach((entry) => {
        const root = find(entry.id);

        const existing = visitGroups.get(root);

        if (!existing) {
          visitGroups.set(root, {
            entryTypes: new Set([entry.entry_type]),
            latestDate: entry.joined_at,
          });
        } else {
          existing.entryTypes.add(entry.entry_type);

          if (entry.joined_at > existing.latestDate) {
            existing.latestDate = entry.joined_at;
          }
        }
      });

      // Include appointments that have not yet generated queue entries.
      const queuedAppointmentIds = new Set(
        patientEntries
          .map((entry) => entry.appointment_id)
          .filter((id): id is string => Boolean(id))
      );

      patientAppointments.forEach((appointment) => {
        if (
          !queuedAppointmentIds.has(appointment.id) &&
          !["cancelled", "no_show"].includes(appointment.status)
        ) {
          visitGroups.set(`appointment-${appointment.id}`, {
            entryTypes: new Set(["appointment"]),
            latestDate: appointment.appointment_date,
          });
        }
      });

      const allTypes = new Set<string>();

      visitGroups.forEach((visit) => {
        visit.entryTypes.forEach((type) => allTypes.add(type));
      });

      let patientType: PatientRow["type"] = "Walk-in";

      if (allTypes.has("walk_in") && allTypes.has("appointment")) {
        patientType = "Mixed";
      } else if (allTypes.has("appointment")) {
        patientType = "Reserved";
      }

      // Count no-show events once per linked visit.
      const noShowGroups = new Set<string>();

      patientEvents.forEach((event) => {
        if (event.event_type === "no_show") {
          noShowGroups.add(find(event.queue_entry_id));
        }
      });

      // Collect current and historical room names.
      const rooms = new Set<string>();

      patientEntries.forEach((entry) => {
        if (entry.current_room_id) {
          const name = roomNames.get(entry.current_room_id);
          if (name) rooms.add(name);
        }
      });

      patientEvents.forEach((event) => {
        if (event.room_id) {
          const name = roomNames.get(event.room_id);
          if (name) rooms.add(name);
        }
      });

      const dates = [
        ...Array.from(visitGroups.values()).map((visit) => visit.latestDate),
        ...patientAppointments
          .filter((appointment) => appointment.status === "completed")
          .map((appointment) => appointment.appointment_date),
      ].sort((a, b) => b.localeCompare(a));

      return {
        id: patient.id,
        name: patient.full_name,
        phone: patient.phone,
        type: patientType,
        rooms: Array.from(rooms),
        visits: visitGroups.size,
        noShows: noShowGroups.size,
        lastSeen: dates[0] ?? null,
      };
    });

    result.sort((a, b) => {
      if (!a.lastSeen) return 1;
      if (!b.lastSeen) return -1;
      return b.lastSeen.localeCompare(a.lastSeen);
    });

    return {
      success: true,
      patients: result,
    };
  } catch (error) {
  console.error("PATIENTS ERROR DETAILS:", {
    message: error instanceof Error ? error.message : String(error),
    error,
  });

  return {
    success: false,
    patients: [],
    error: error instanceof Error ? error.message : String(error),
  };
}
}
