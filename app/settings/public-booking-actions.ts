"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = {
  success: boolean;
  message: string;
  code?: string;
  enabled?: boolean;
};

async function authorizeClinicAdmin(clinicId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, authorized: false };
  }

  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (platformAdmin) {
    return { supabase, authorized: true };
  }

  const { data: membership } = await supabase
    .from("clinic_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .maybeSingle();

  return {
    supabase,
    authorized: membership?.role === "administrator",
  };
}

export async function setPublicBookingEnabled(
  clinicId: string,
  enabled: boolean
): Promise<ActionResult> {
  if (!clinicId || typeof enabled !== "boolean") {
    return {
      success: false,
      message: "Invalid clinic or booking status.",
    };
  }

  const { supabase, authorized } =
    await authorizeClinicAdmin(clinicId);

  if (!authorized) {
    return {
      success: false,
      message: "You are not authorized to change this clinic's booking settings.",
    };
  }

  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .select("id, public_booking_code")
    .eq("id", clinicId)
    .eq("is_active", true)
    .maybeSingle();

  if (clinicError || !clinic) {
    return {
      success: false,
      message: "Clinic not found or inactive.",
    };
  }

  // Create a code if this clinic does not have one yet.
  let code = clinic.public_booking_code;

  if (!code) {
    code = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  }

  const { error } = await supabase
    .from("clinics")
    .update({
      public_booking_code: code,
      public_booking_enabled: enabled,
    })
    .eq("id", clinicId);

  if (error) {
    console.error("Public booking toggle error:", error);

    return {
      success: false,
      message: "Unable to update public booking settings.",
    };
  }

  revalidatePath("/settings");

  return {
    success: true,
    message: enabled
      ? "Public appointment booking enabled."
      : "Public appointment booking disabled.",
    code,
    enabled,
  };
}

export async function regeneratePublicBookingCode(
  clinicId: string
): Promise<ActionResult> {
  if (!clinicId) {
    return {
      success: false,
      message: "Select a clinic first.",
    };
  }

  const { supabase, authorized } =
    await authorizeClinicAdmin(clinicId);

  if (!authorized) {
    return {
      success: false,
      message: "You are not authorized to regenerate this clinic's code.",
    };
  }

  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .select("id, public_booking_enabled")
    .eq("id", clinicId)
    .eq("is_active", true)
    .maybeSingle();

  if (clinicError || !clinic) {
    return {
      success: false,
      message: "Clinic not found or inactive.",
    };
  }

  // Retry in the extremely unlikely event of a unique-code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const newCode = crypto
      .randomUUID()
      .replaceAll("-", "")
      .slice(0, 12);

    const { data: updatedClinic, error } = await supabase
      .from("clinics")
      .update({ public_booking_code: newCode })
      .eq("id", clinicId)
      .select("public_booking_code")
      .maybeSingle();

    if (!error && updatedClinic?.public_booking_code) {
      revalidatePath("/settings");

      return {
        success: true,
        message: "A new booking code has been generated. The previous link is no longer valid.",
        code: updatedClinic.public_booking_code,
        enabled: clinic.public_booking_enabled,
      };
    }

    // Retry only for a unique constraint collision.
    if (error?.code !== "23505") {
      console.error("Public booking code regeneration error:", error);

      return {
        success: false,
        message: "Unable to regenerate the booking code.",
      };
    }
  }

  return {
    success: false,
    message: "Could not generate a unique code. Please try again.",
  };
}