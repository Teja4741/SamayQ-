
"use server";

import { createClient } from "@/lib/supabase/server";

type PublicAppointmentInput = {
  code: string;
  patientName: string;
  patientPhone: string;
  patientAge: number | null;
  assignmentId: string | null;
  departmentId: string | null;
  appointmentDate: string;
  startTime: string;
  notes: string;
};

type ActionResult = {
  success: boolean;
  message: string;
  trackingToken?: string;
};

export async function createPublicAppointment(
  input: PublicAppointmentInput
): Promise<ActionResult> {
  try {
    if (
      !input.code?.trim() ||
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

    if (
      input.patientName.trim().length > 100 ||
      input.patientPhone.trim().length > 15
    ) {
      return {
        success: false,
        message: "Please check the patient details.",
      };
    }

    if (
      input.patientAge !== null &&
      (!Number.isInteger(input.patientAge) ||
        input.patientAge < 0 ||
        input.patientAge > 120)
    ) {
      return {
        success: false,
        message: "Please enter a valid age.",
      };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.appointmentDate)) {
      return {
        success: false,
        message: "Invalid appointment date.",
      };
    }

    if (!/^\d{2}:\d{2}$/.test(input.startTime)) {
      return {
        success: false,
        message: "Invalid appointment time.",
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
      "create_public_appointment",
      {
        p_code: input.code.trim(),
        p_patient_name: input.patientName.trim(),
        p_patient_phone: input.patientPhone.trim(),
        p_patient_age: input.patientAge,
        p_assignment_id: input.assignmentId,
        p_department_id: input.departmentId,
        p_appointment_date: input.appointmentDate,
        p_start_time: input.startTime,
        p_notes: input.notes?.trim() || null,
      }
    );

    if (error) {
      console.error("Public appointment RPC error:", error);

      return {
        success: false,
        message: "Unable to book your appointment. Please try again.",
      };
    }

    if (!data?.success) {
      return {
        success: false,
        message: data?.message || "Unable to complete your booking.",
      };
    }

    if (
      typeof data.tracking_token !== "string" ||
      !/^[a-f0-9]{64}$/i.test(data.tracking_token)
    ) {
      console.error("Booking succeeded but tracking token was missing.");

      return {
        success: false,
        message:
          "Your appointment may be booked, but we couldn't generate its tracking link. Please contact the hospital before booking again.",
      };
    }

    return {
      success: true,
      message: data.message || "Appointment booked successfully.",
      trackingToken: data.tracking_token,
    };
  } catch (error) {
    console.error("Public booking error:", error);

    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}
