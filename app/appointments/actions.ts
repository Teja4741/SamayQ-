
"use server";

import { createClient } from "@/lib/supabase/server";

type BookingMode = "doctor" | "department" | "custom";

type AppointmentInput = {
  clinicId: string;
  patientName: string;
  patientPhone: string;
  patientAge: number | null;
  assignmentId?: string;
  departmentId?: string;
  appointmentDate: string;
  startTime: string;
  notes: string;
};

type ActionResult = {
  success: boolean;
  message: string;
};

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}


async function getAuthorizedClinic(
  clinicId: string
): Promise<{ allowed: boolean; message?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { allowed: false, message: "Please sign in again." };
  }

  const { data: admin, error: adminError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("Admin verification error:", adminError);
    return {
      allowed: false,
      message: "Unable to verify administrator access.",
    };
  }

  if (admin) return { allowed: true };

  const { data: membership, error: membershipError } = await supabase
    .from("clinic_memberships")
    .select("id, clinic_id, role")
    .eq("clinic_id", clinicId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .in("role", ["administrator", "receptionist"])
    .maybeSingle();

  if (membershipError) {
    console.error("Membership verification error:", membershipError);
    return {
      allowed: false,
      message: "Unable to verify clinic permissions.",
    };
  }

  if (!membership) {
    return {
      allowed: false,
      message: "You don't have permission to manage this clinic.",
    };
  }

  if (membership.role === "receptionist") {
    const { data: permission, error: permissionError } = await supabase
      .from("team_permissions")
      .select("screen")
      .eq("clinic_membership_id", membership.id)
      .eq("clinic_id", clinicId)
      .eq("screen", "reservations")
      .eq("can_view", true)
      .maybeSingle();

    if (permissionError || !permission) {
      return {
        allowed: false,
        message: "You don't have permission to access appointments.",
      };
    }
  }

  return { allowed: true };
}


async function getClinicBookingMode(
  clinicId: string
): Promise<"doctor" | "department"> {
  const supabase = await createClient();

  const { data: settings, error } = await supabase
    .from("clinic_settings")
    .select(
      "booking_mode, doctor_booking_enabled, department_booking_enabled"
    )
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (error) {
    console.error("Booking settings error:", error);
    throw new Error("Unable to load clinic booking configuration.");
  }

  if (!settings) return "doctor";

  const mode = settings.booking_mode as BookingMode;

  if (mode === "doctor") return "doctor";
  if (mode === "department") return "department";

  if (mode === "custom") {
    if (
      settings.doctor_booking_enabled &&
      !settings.department_booking_enabled
    ) {
      return "doctor";
    }

    if (
      settings.department_booking_enabled &&
      !settings.doctor_booking_enabled
    ) {
      return "department";
    }
  }

  throw new Error(
    "Invalid clinic booking configuration. Please check Settings."
  );
}

// Find or create a patient inside the selected clinic.
async function getOrCreatePatient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: AppointmentInput
): Promise<{ patientId: string | null; error: string | null }> {
  const normalizedPhone = normalizePhone(input.patientPhone);

  if (!normalizedPhone) {
    return {
      patientId: null,
      error: "Please enter a valid phone number.",
    };
  }

  // Read existing patients belonging to this clinic.
  const { data: patients, error: searchError } = await supabase
    .from("patients")
    .select("id, full_name, phone, age")
    .eq("clinic_id", input.clinicId)
    .order("created_at", { ascending: true });

  if (searchError) {
    console.error("Patient lookup error:", {
      message: searchError.message,
      code: searchError.code,
      details: searchError.details,
      hint: searchError.hint,
    });

    return {
      patientId: null,
      error: `Patient lookup failed: ${searchError.message} (${searchError.code})`,
    };
  }

  const existingPatient = (patients ?? []).find(
    (patient) => normalizePhone(patient.phone) === normalizedPhone
  );

  if (existingPatient) {
    const updates: {
      full_name?: string;
      age?: number;
      updated_at?: string;
    } = {};

    if (existingPatient.full_name !== input.patientName.trim()) {
      updates.full_name = input.patientName.trim();
    }

    if (
      input.patientAge !== null &&
      existingPatient.age !== input.patientAge
    ) {
      updates.age = input.patientAge;
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("patients")
        .update(updates)
        .eq("id", existingPatient.id)
        .eq("clinic_id", input.clinicId);

      if (updateError) {
        console.error("Patient update error:", updateError);

        return {
          patientId: null,
          error: `Patient update failed: ${updateError.message} (${updateError.code})`,
        };
      }
    }

    return {
      patientId: existingPatient.id,
      error: null,
    };
  }

  // Insert without RETURNING to avoid the INSERT ... RETURNING RLS failure.
  const { error: insertError } = await supabase
    .from("patients")
    .insert({
      clinic_id: input.clinicId,
      full_name: input.patientName.trim(),
      phone: input.patientPhone.trim(),
      age: input.patientAge,
    });

  if (insertError) {
    console.error("Patient insert error:", {
      message: insertError.message,
      code: insertError.code,
      details: insertError.details,
      hint: insertError.hint,
    });

    return {
      patientId: null,
      error: `Patient save failed: ${insertError.message} (${insertError.code})`,
    };
  }

  // Fetch the inserted patient's ID in a separate SELECT request.
  const { data: newPatient, error: fetchError } = await supabase
    .from("patients")
    .select("id")
    .eq("clinic_id", input.clinicId)
    .eq("phone", input.patientPhone.trim())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError || !newPatient) {
    console.error("Patient fetch after insert failed:", {
      message: fetchError?.message,
      code: fetchError?.code,
      details: fetchError?.details,
      hint: fetchError?.hint,
    });

    return {
      patientId: null,
      error: fetchError
        ? `Patient was saved, but fetching its ID failed: ${fetchError.message} (${fetchError.code})`
        : "Patient was saved, but its ID could not be retrieved.",
    };
  }

  return {
    patientId: newPatient.id,
    error: null,
  };
}

export async function createAppointment(
  input: AppointmentInput
): Promise<ActionResult> {
  try {
    // Validate input.
    if (
      !input.clinicId ||
      !input.patientName?.trim() ||
      !input.patientPhone?.trim() ||
      !input.appointmentDate ||
      !input.startTime
    ) {
      return {
        success: false,
        message: "Please complete all required fields.",
      };
    }

    if (input.patientName.trim().length > 100) {
      return {
        success: false,
        message: "Patient name cannot exceed 100 characters.",
      };
    }

    if (input.patientPhone.trim().length > 15) {
      return {
        success: false,
        message: "Please enter a valid phone number.",
      };
    }

    if (
      input.patientAge !== null &&
      (
        !Number.isInteger(input.patientAge) ||
        input.patientAge < 0 ||
        input.patientAge > 120
      )
    ) {
      return {
        success: false,
        message: "Please enter a valid patient age.",
      };
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(input.appointmentDate) ||
      !/^\d{2}:\d{2}$/.test(input.startTime)
    ) {
      return {
        success: false,
        message: "Please enter a valid appointment date and time.",
      };
    }

    // Verify clinic authorization.
    const permission = await getAuthorizedClinic(input.clinicId);

    if (!permission.allowed) {
      return {
        success: false,
        message: permission.message ?? "Access denied.",
      };
    }

    const supabase = await createClient();

    // Verify the actual authenticated application session.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Appointment user session error:", userError);

      return {
        success: false,
        message: "Your session has expired. Please sign in again.",
      };
    }

    // Resolve booking mode.
    const bookingMode = await getClinicBookingMode(input.clinicId);

    let assignmentId: string | null = null;
    let departmentId: string | null = null;
    let durationMinutes = 15;

    // Validate doctor or department.
    if (bookingMode === "doctor") {
      if (!input.assignmentId) {
        return {
          success: false,
          message: "Please select a doctor.",
        };
      }

      const { data: assignment, error: assignmentError } =
        await supabase
          .from("doctor_clinic_assignments")
          .select("id, department_id, consultation_duration_minutes")
          .eq("id", input.assignmentId)
          .eq("clinic_id", input.clinicId)
          .eq("is_active", true)
          .maybeSingle();

      if (assignmentError || !assignment) {
        console.error("Doctor validation error:", assignmentError);

        return {
          success: false,
          message: "The selected doctor is not active at this clinic.",
        };
      }

      assignmentId = assignment.id;
      departmentId = assignment.department_id;
      durationMinutes =
        assignment.consultation_duration_minutes || 15;
    } else {
      if (!input.departmentId) {
        return {
          success: false,
          message: "Please select a department.",
        };
      }

      const { data: department, error: departmentError } =
        await supabase
          .from("departments")
          .select("id")
          .eq("id", input.departmentId)
          .eq("clinic_id", input.clinicId)
          .eq("is_active", true)
          .maybeSingle();

      if (departmentError || !department) {
        console.error("Department validation error:", departmentError);

        return {
          success: false,
          message:
            "The selected department is not active at this clinic.",
        };
      }

      departmentId = department.id;
    }

    // Find or create patient.
    const patientResult = await getOrCreatePatient(
      supabase,
      input
    );

    if (!patientResult.patientId) {
      return {
        success: false,
        message: patientResult.error ?? "Unable to save patient details.",
      };
    }

    // Create appointment linked to the patient.
    const { error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        clinic_id: input.clinicId,
        patient_id: patientResult.patientId,
        doctor_clinic_assignment_id: assignmentId,
        department_id: departmentId,
        appointment_date: input.appointmentDate,
        start_time: input.startTime,
        duration_minutes: durationMinutes,
        booking_type: "booking",
        status: "booked",
        notes: input.notes?.trim() || null,
        created_by_type: "staff",
      });

    if (appointmentError) {
      console.error("Appointment insert error:", {
        message: appointmentError.message,
        code: appointmentError.code,
        details: appointmentError.details,
        hint: appointmentError.hint,
      });

      if (appointmentError.code === "23P01") {
        return {
          success: false,
          message:
            "This time slot overlaps with another appointment. Please choose a different time.",
        };
      }

      return {
        success: false,
        message:
          `Patient was saved, but appointment creation failed: ${appointmentError.message} (${appointmentError.code})`,
      };
    }

    return {
      success: true,
      message: "Appointment booked successfully.",
    };
  } catch (error) {
    console.error("Create appointment error:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    };
  }
}

export async function cancelAppointment(
  appointmentId: string,
  clinicId: string
): Promise<ActionResult> {
  try {
    const permission = await getAuthorizedClinic(clinicId);

    if (!permission.allowed) {
      return {
        success: false,
        message: permission.message ?? "Access denied.",
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId)
      .eq("clinic_id", clinicId)
      .not("status", "in", '("cancelled","completed","no_show")')
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Cancel appointment error:", error);

      return {
        success: false,
        message: "Unable to cancel appointment: " + error.message,
      };
    }

    if (!data) {
      return {
        success: false,
        message:
          "Appointment not found or it can no longer be cancelled.",
      };
    }

    return {
      success: true,
      message: "Appointment cancelled successfully.",
    };
  } catch (error) {
    console.error("Unexpected cancellation error:", error);

    return {
      success: false,
      message: "An unexpected error occurred.",
    };
  }
}
