
"use server";

import { createClient } from "@/lib/supabase/server";

export type FeatureFlagInput = {
  clinicId: string;
  bookingMode: "doctor" | "department" | "custom";
  doctorBookingEnabled: boolean;
  departmentBookingEnabled: boolean;
  queueMode: "shared" | "separate";
};

type ActionResult = {
  success: boolean;
  message: string;
};

export async function saveClinicFeatureFlags(
  input: FeatureFlagInput
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 1. Verify logged-in user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: "Please sign in again.",
      };
    }

    // 2. Validate input
    if (
      !input.clinicId ||
      !["doctor", "department", "custom"].includes(input.bookingMode) ||
      !["shared", "separate"].includes(input.queueMode) ||
      typeof input.doctorBookingEnabled !== "boolean" ||
      typeof input.departmentBookingEnabled !== "boolean"
    ) {
      return {
        success: false,
        message: "Invalid feature flag settings.",
      };
    }

    // 3. Validate booking configuration
    if (input.bookingMode === "doctor") {
      if (
        !input.doctorBookingEnabled ||
        input.departmentBookingEnabled
      ) {
        return {
          success: false,
          message:
            "Doctor-wise mode requires doctor booking only.",
        };
      }
    }

    if (input.bookingMode === "department") {
      if (
        !input.departmentBookingEnabled ||
        input.doctorBookingEnabled
      ) {
        return {
          success: false,
          message:
            "Department-wise mode requires department booking only.",
        };
      }
    }

    if (
      input.bookingMode === "custom" &&
      input.doctorBookingEnabled ===
        input.departmentBookingEnabled
    ) {
      return {
        success: false,
        message:
          "Select exactly one booking model in Custom mode.",
      };
    }

    // 4. Check whether the user is a Master Admin
    const { data: adminRecord, error: adminError } =
      await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (adminError) {
      console.error("Platform admin verification error:", adminError);

      return {
        success: false,
        message: "Unable to verify administrator access.",
      };
    }

    const isPlatformAdmin = Boolean(adminRecord);

    // 5. If not Master Admin, verify clinic administrator membership
    if (!isPlatformAdmin) {
      const { data: membership, error: membershipError } =
        await supabase
          .from("clinic_memberships")
          .select("clinic_id")
          .eq("clinic_id", input.clinicId)
          .eq("user_id", user.id)
          .eq("is_active", true)
          .eq("role", "administrator")
          .maybeSingle();

      if (membershipError) {
        return {
          success: false,
          message: "Unable to verify clinic permissions.",
        };
      }

      if (!membership) {
        return {
          success: false,
          message:
            "Only Master Admins and clinic administrators can update these settings.",
        };
      }
    }

    // 6. Save settings to Supabase
    const { error: saveError } = await supabase
      .from("clinic_settings")
      .upsert(
        {
          clinic_id: input.clinicId,
          booking_mode: input.bookingMode,
          doctor_booking_enabled: input.doctorBookingEnabled,
          department_booking_enabled:
            input.departmentBookingEnabled,
          queue_mode: input.queueMode,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "clinic_id",
        }
      );

    if (saveError) {
      console.error("Clinic settings save error:", saveError);

      return {
        success: false,
        message: "Unable to save settings: " + saveError.message,
      };
    }

    return {
      success: true,
      message: "Clinic settings saved successfully!",
    };
  } catch (error) {
    console.error("Unexpected clinic settings error:", error);

    return {
      success: false,
      message: "An unexpected error occurred while saving settings.",
    };
  }
}
