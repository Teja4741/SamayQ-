
"use server";

import { createClient } from "@/lib/supabase/server";

export type TrackingData = {
  success: boolean;
  message?: string;
  clinic?: {
    name: string;
    address: string | null;
    timezone: string;
  };
  booking?: {
    type: "doctor" | "department";
    doctor_name: string | null;
    specialization: string | null;
    department_name: string | null;
    appointment_date: string;
    appointment_time: string;
    appointment_status: string;
  };
  queue?: {
    status: string;
    token_number: number | null;
    token_label: string | null;
    patients_ahead: number | null;
    queue_position: number | null;
    current_room_id: string | null;
  };
};

export async function getPublicAppointmentTracking(
  token: string
): Promise<TrackingData> {
  try {
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return {
        success: false,
        message: "Invalid tracking link.",
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
      "get_public_appointment_tracking",
      { p_token: token }
    );

    if (error) {
      console.error("Tracking RPC error:", error);

      return {
        success: false,
        message: "Unable to load appointment tracking.",
      };
    }

    return data as TrackingData;
  } catch (error) {
    console.error("Appointment tracking error:", error);

    return {
      success: false,
      message: "Something went wrong. Please try again.",
    };
  }
}
