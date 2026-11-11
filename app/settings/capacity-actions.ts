
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type CapacityScope = "clinic" | "doctor" | "department" | "section";

type SaveCapacityInput = {
  id: string | null;
  clinicId: string;
  scopeType: CapacityScope;
  departmentId: string | null;

  appointmentDailyLimitEnabled: boolean;
  appointmentDailyLimit: number | null;

  appointmentSlotLimitEnabled: boolean;
  appointmentSlotLimit: number | null;

  walkinDailyLimitEnabled: boolean;
  walkinDailyLimit: number | null;
};

type DeleteCapacityInput = {
  ruleId: string;
  clinicId: string;
};

type ActionResult = {
  success: boolean;
  message: string;
};

function validateLimit(
  enabled: boolean,
  value: number | null,
  label: string
): string | null {
  if (!enabled && value !== null) {
    return `${label} must be empty when its limit is disabled.`;
  }

  if (
    enabled &&
    (value === null || !Number.isInteger(value) || value <= 0)
  ) {
    return `${label} must be a positive whole number.`;
  }

  return null;
}

async function verifyClinicPermission(
  clinicId: string
): Promise<ActionResult> {
  const supabase = await createClient();

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

  // Check platform administrator
  const { data: adminRecord, error: adminError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    return {
      success: false,
      message: "Unable to verify administrator access.",
    };
  }

  if (adminRecord) {
    return {
      success: true,
      message: "Authorized.",
    };
  }

  // Only clinic administrators and receptionists can manage capacity.
  const { data: membership, error: membershipError } = await supabase
    .from("clinic_memberships")
    .select("role")
    .eq("clinic_id", clinicId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .in("role", ["administrator", "receptionist"])
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
        "Only clinic administrators and receptionists can manage capacity settings.",
    };
  }

  return {
    success: true,
    message: "Authorized.",
  };
}

export async function saveRegistrationCapacityRule(
  input: SaveCapacityInput
): Promise<ActionResult> {
  try {
    if (!input.clinicId) {
      return {
        success: false,
        message: "Clinic ID is required.",
      };
    }

    const permission = await verifyClinicPermission(input.clinicId);

    if (!permission.success) {
      return permission;
    }

    const allowedScopes: CapacityScope[] = [
      "clinic",
      "doctor",
      "department",
      "section",
    ];

    if (!allowedScopes.includes(input.scopeType)) {
      return {
        success: false,
        message: "Invalid capacity scope.",
      };
    }

    if (
      input.scopeType === "department" &&
      !input.departmentId
    ) {
      return {
        success: false,
        message: "Please select a department.",
      };
    }

    if (
      input.scopeType === "doctor" ||
      input.scopeType === "section"
    ) {
      return {
        success: false,
        message:
          "Doctor and section capacity configuration is not available yet.",
      };
    }

    const validations = [
      validateLimit(
        input.appointmentDailyLimitEnabled,
        input.appointmentDailyLimit,
        "Appointment daily limit"
      ),
      validateLimit(
        input.appointmentSlotLimitEnabled,
        input.appointmentSlotLimit,
        "Appointment slot limit"
      ),
      validateLimit(
        input.walkinDailyLimitEnabled,
        input.walkinDailyLimit,
        "Walk-in daily limit"
      ),
    ];

    const validationError = validations.find(
      (message) => message !== null
    );

    if (validationError) {
      return {
        success: false,
        message: validationError,
      };
    }

    if (
      !input.appointmentDailyLimitEnabled &&
      !input.appointmentSlotLimitEnabled &&
      !input.walkinDailyLimitEnabled
    ) {
      return {
        success: false,
        message: "Enable at least one capacity limit.",
      };
    }

    const supabase = await createClient();

    // Ensure the selected department belongs to this clinic.
    if (input.scopeType === "department") {
      const { data: department, error: departmentError } =
        await supabase
          .from("departments")
          .select("id")
          .eq("id", input.departmentId!)
          .eq("clinic_id", input.clinicId)
          .maybeSingle();

      if (departmentError || !department) {
        return {
          success: false,
          message: "Department not found or does not belong to this clinic.",
        };
      }
    }

    const payload = {
      clinic_id: input.clinicId,
      scope_type: input.scopeType,

      doctor_clinic_assignment_id: null,

      department_id:
        input.scopeType === "department"
          ? input.departmentId
          : null,

      section_id: null,

      appointment_daily_limit_enabled:
        input.appointmentDailyLimitEnabled,

      appointment_daily_limit:
        input.appointmentDailyLimitEnabled
          ? input.appointmentDailyLimit
          : null,

      appointment_slot_limit_enabled:
        input.appointmentSlotLimitEnabled,

      appointment_slot_limit:
        input.appointmentSlotLimitEnabled
          ? input.appointmentSlotLimit
          : null,

      walkin_daily_limit_enabled:
        input.walkinDailyLimitEnabled,

      walkin_daily_limit:
        input.walkinDailyLimitEnabled
          ? input.walkinDailyLimit
          : null,

      updated_at: new Date().toISOString(),
    };

    // Update an existing rule when editing.
    if (input.id) {
      const { data: existingRule, error: existingError } =
        await supabase
          .from("registration_capacity_rules")
          .select("id")
          .eq("id", input.id)
          .eq("clinic_id", input.clinicId)
          .maybeSingle();

      if (existingError || !existingRule) {
        return {
          success: false,
          message: "Capacity rule not found or access denied.",
        };
      }

      const { error: updateError } = await supabase
        .from("registration_capacity_rules")
        .update(payload)
        .eq("id", input.id)
        .eq("clinic_id", input.clinicId);

      if (updateError) {
        return {
          success: false,
          message: `Unable to update capacity rule: ${updateError.message}`,
        };
      }

      revalidatePath("/settings");

      return {
        success: true,
        message: "Capacity rule updated successfully.",
      };
    }

    // Check whether a rule already exists for this scope.
    let existingQuery = supabase
      .from("registration_capacity_rules")
      .select("id")
      .eq("clinic_id", input.clinicId)
      .eq("scope_type", input.scopeType);

    if (input.scopeType === "clinic") {
      existingQuery = existingQuery.is("department_id", null);
    } else if (input.scopeType === "department") {
      existingQuery = existingQuery.eq(
        "department_id",
        input.departmentId!
      );
    }

    const { data: existingRule, error: lookupError } =
      await existingQuery.maybeSingle();

    if (lookupError) {
      return {
        success: false,
        message: "Unable to check existing capacity rules.",
      };
    }

    if (existingRule) {
      return {
        success: false,
        message:
          "A capacity rule already exists for this scope. Edit the existing rule instead.",
      };
    }

    const { error: insertError } = await supabase
      .from("registration_capacity_rules")
      .insert(payload);

    if (insertError) {
      return {
        success: false,
        message: `Unable to create capacity rule: ${insertError.message}`,
      };
    }

    revalidatePath("/settings");

    return {
      success: true,
      message: "Capacity rule created successfully.",
    };
  } catch (error) {
    console.error("Capacity save error:", error);

    return {
      success: false,
      message: "An unexpected error occurred while saving capacity settings.",
    };
  }
}

export async function deleteRegistrationCapacityRule(
  input: DeleteCapacityInput
): Promise<ActionResult> {
  try {
    if (!input.ruleId || !input.clinicId) {
      return {
        success: false,
        message: "Capacity rule and clinic IDs are required.",
      };
    }

    const permission = await verifyClinicPermission(input.clinicId);

    if (!permission.success) {
      return permission;
    }

    const supabase = await createClient();

    const { data: existingRule, error: lookupError } =
      await supabase
        .from("registration_capacity_rules")
        .select("id")
        .eq("id", input.ruleId)
        .eq("clinic_id", input.clinicId)
        .maybeSingle();

    if (lookupError || !existingRule) {
      return {
        success: false,
        message: "Capacity rule not found or access denied.",
      };
    }

    const { error: deleteError } = await supabase
      .from("registration_capacity_rules")
      .delete()
      .eq("id", input.ruleId)
      .eq("clinic_id", input.clinicId);

    if (deleteError) {
      return {
        success: false,
        message: `Unable to delete capacity rule: ${deleteError.message}`,
      };
    }

    revalidatePath("/settings");

    return {
      success: true,
      message: "Capacity rule deleted successfully.",
    };
  } catch (error) {
    console.error("Capacity delete error:", error);

    return {
      success: false,
      message: "An unexpected error occurred while deleting the capacity rule.",
    };
  }
}
