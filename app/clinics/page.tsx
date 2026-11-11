
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClinicsClient from "./ClinicsClient";
import {
  createBusinessAction,
  toggleClinicStatusAction,
} from "./actions";

export const instant = false;

type PageProps = {
  searchParams: Promise<{
    modal?: string;
    created?: string;
    error?: string;
  }>;
};

async function verifyPlatformAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const { data: admin, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(
      "Unable to verify platform administrator permissions."
    );
  }

  if (!admin) {
    redirect("/");
  }

  return supabase;
}

export default async function ClinicsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const supabase = await verifyPlatformAdmin();

  // 1. Fetch all clinics
  const { data: clinics, error: clinicsError } = await supabase
    .from("clinics")
    .select(
      "id, name, address, phone, business_type, is_active, created_at"
    )
    .order("created_at", { ascending: false });

  // 2. Fetch booking configuration from the correct table
  let settingsErrorMessage = "";

  const clinicIds = (clinics ?? []).map((clinic) => clinic.id);

  let settingsMap = new Map<
    string,
    {
      booking_mode: string;
      doctor_booking_enabled: boolean;
      department_booking_enabled: boolean;
    }
  >();

  if (!clinicsError && clinicIds.length > 0) {
    const { data: settings, error } = await supabase
      .from("clinic_settings")
      .select(
        "clinic_id, booking_mode, doctor_booking_enabled, department_booking_enabled"
      )
      .in("clinic_id", clinicIds);

    if (error) {
      console.error("Clinic settings fetch error:", error);
      settingsErrorMessage =
        "Unable to load clinic booking configurations.";
    } else {
      settingsMap = new Map(
        (settings ?? []).map((setting) => [
          setting.clinic_id,
          {
            booking_mode: setting.booking_mode,
            doctor_booking_enabled:
              setting.doctor_booking_enabled,
            department_booking_enabled:
              setting.department_booking_enabled,
          },
        ])
      );
    }
  }

  // 3. Combine clinic details with their saved settings
  const clinicsWithSettings = (clinics ?? []).map((clinic) => {
    const settings = settingsMap.get(clinic.id);

    return {
      ...clinic,
      booking_mode: settings?.booking_mode ?? null,
      doctor_booking_enabled:
        settings?.doctor_booking_enabled ?? false,
      department_booking_enabled:
        settings?.department_booking_enabled ?? false,
    };
  });

  return (
    <ClinicsClient
      clinics={clinicsWithSettings}
      clinicsError={
        clinicsError
          ? "Unable to load businesses. Check your Supabase permissions."
          : settingsErrorMessage
      }
      modal={params.modal === "business" ? "business" : null}
      created={params.created ?? ""}
      error={params.error ?? ""}
      createBusiness={createBusinessAction}
      toggleClinicStatus={toggleClinicStatusAction}
    />
  );
}
