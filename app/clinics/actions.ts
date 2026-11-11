
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = {
  success: boolean;
  error?: string;
};

async function verifyPlatformAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please sign in before continuing.");
  }

  const { data: admin, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !admin) {
    console.error(
      "Platform admin verification failed:",
      error?.message
    );

    throw new Error(
      "You don't have permission to manage businesses."
    );
  }

  return supabase;
}

export async function createBusinessAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const supabase = await verifyPlatformAdmin();

    const name = String(formData.get("name") ?? "").trim();
    const businessType = String(
      formData.get("business_type") ?? ""
    ).trim();
    const address = String(
      formData.get("location_name") ?? ""
    ).trim();

    const allowedTypes = [
      "Healthcare",
      "Restaurant",
      "Retail",
      "Other",
    ];

    if (
      !name ||
      !address ||
      !allowedTypes.includes(businessType)
    ) {
      return {
        success: false,
        error:
          "Please complete all required fields with valid values.",
      };
    }

    const { error } = await supabase
      .from("clinics")
      .insert({
        name,
        business_type: businessType,
        address,
      });

    if (error) {
      console.error(
        "Business creation failed:",
        error.message
      );

      return {
        success: false,
        error:
          "Unable to create the business. Check your Supabase permissions.",
      };
    }

    revalidatePath("/clinics");
    revalidatePath("/");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Create business action failed:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while creating the business.",
    };
  }
}

export async function updateBusinessAddressAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const supabase = await verifyPlatformAdmin();

    const clinicId = String(
      formData.get("clinic_id") ?? ""
    ).trim();

    const address = String(
      formData.get("address") ?? ""
    ).trim();

    if (!clinicId || !address) {
      return {
        success: false,
        error: "Select a business and enter its address.",
      };
    }

    const { data: clinic, error } = await supabase
      .from("clinics")
      .update({ address })
      .eq("id", clinicId)
      .select("id")
      .maybeSingle();

    if (error || !clinic) {
      console.error(
        "Business address update failed:",
        error?.message
      );

      return {
        success: false,
        error: "Unable to update the business address.",
      };
    }

    revalidatePath("/clinics");
    revalidatePath("/");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error(
      "Update business address action failed:",
      error
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while updating the address.",
    };
  }
}

// Activate or deactivate a clinic.
// Only a verified Master Admin can perform this operation.
export async function toggleClinicStatusAction(
  clinicId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const supabase = await verifyPlatformAdmin();

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        clinicId
      ) ||
      typeof isActive !== "boolean"
    ) {
      return {
        success: false,
        error: "Invalid clinic or status.",
      };
    }

    const { data: clinic, error } = await supabase
      .from("clinics")
      .update({ is_active: isActive })
      .eq("id", clinicId)
      .select("id, is_active")
      .maybeSingle();

if (error || !clinic) {
  console.error("Clinic status update failed:", {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    clinicFound: !!clinic,
  });

  return {
    success: false,
    error: error
      ? `${error.message} (Code: ${error.code ?? "unknown"})`
      : "No clinic was updated. Check the clinic ID and database permissions.",
  };
}

    revalidatePath("/clinics");
    revalidatePath("/");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error(
      "Toggle clinic status action failed:",
      error
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while changing clinic status.",
    };
  }
}
