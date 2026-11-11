
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/app/components/Navbar";
import SettingsClient from "@/app/settings/SettingsClient";

export const instant = false;

type PageProps = {
  searchParams: Promise<{ clinicId?: string }>;
};

type ClinicSettings = {
  clinic_id: string;
  booking_mode: "doctor" | "department" | "custom";
  doctor_booking_enabled: boolean;
  department_booking_enabled: boolean;
  queue_mode: "shared" | "separate";
};

type RegistrationCapacityRule = {
  id: string;
  clinic_id: string;
  scope_type: "clinic" | "doctor" | "department" | "section";
  doctor_clinic_assignment_id: string | null;
  department_id: string | null;
  section_id: string | null;
  appointment_daily_limit_enabled: boolean;
  appointment_daily_limit: number | null;
  appointment_slot_limit_enabled: boolean;
  appointment_slot_limit: number | null;
  walkin_daily_limit_enabled: boolean;
  walkin_daily_limit: number | null;
  created_at: string;
  updated_at: string;
};

type Clinic = {
  id: string;
  name: string;
  public_booking_code: string | null;
  public_booking_enabled: boolean;
};

export default async function SettingsPage({
  searchParams,
}: PageProps) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const params = await searchParams;
  const requestedClinicId = params.clinicId;

  // Check platform administrator access
  const { data: adminRecord, error: adminError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    return (
      <main className="p-6">
        Unable to verify administrator access.
      </main>
    );
  }

  const isPlatformAdmin = Boolean(adminRecord);

  // Check clinic memberships
  const { data: memberships, error: membershipError } =
    await supabase
      .from("clinic_memberships")
      .select("clinic_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true);

  if (membershipError) {
    return (
      <main className="p-6">
        Unable to verify clinic access.
      </main>
    );
  }

  const allowedClinicIds = [
    ...new Set((memberships ?? []).map((item) => item.clinic_id)),
  ];

  let clinicId: string | null = null;

  if (isPlatformAdmin) {
    clinicId = requestedClinicId || null;
  } else {
    if (allowedClinicIds.length === 0) {
      return (
        <main className="p-6">
          You do not have access to any clinic.
        </main>
      );
    }

    if (requestedClinicId) {
      if (!allowedClinicIds.includes(requestedClinicId)) {
        return (
          <main className="p-6">
            You do not have access to this clinic.
          </main>
        );
      }

      clinicId = requestedClinicId;
    } else if (allowedClinicIds.length === 1) {
      clinicId = allowedClinicIds[0];
    }
  }

  // Load available clinics, including their individual public booking settings
  let clinicQuery = supabase
    .from("clinics")
    .select(
      "id, name, public_booking_code, public_booking_enabled"
    )
    .eq("is_active", true)
    .order("name");

  if (!isPlatformAdmin) {
    clinicQuery = clinicQuery.in("id", allowedClinicIds);
  }

  const { data: clinics, error: clinicsError } =
    await clinicQuery;

  if (clinicsError) {
    console.error("Clinic loading error:", clinicsError);

    return (
      <main className="p-6">
        Unable to load clinics.
      </main>
    );
  }

  const availableClinics: Clinic[] = clinics ?? [];

  const selectedClinic = availableClinics.find(
    (item) => item.id === clinicId
  );

  if (clinicId && !selectedClinic) {
    return (
      <main className="p-6">
        Clinic not found or access denied.
      </main>
    );
  }

  // Initial data
  let departments: {
    id: string;
    name: string;
    is_active: boolean;
  }[] = [];

  let initialSettings: ClinicSettings | null = null;

  let initialCapacityRules: RegistrationCapacityRule[] = [];

  if (clinicId) {
    // Load departments
    const { data, error } = await supabase
      .from("departments")
      .select("id, name, is_active")
      .eq("clinic_id", clinicId)
      .order("name");

    if (error) {
      return (
        <>
          <Navbar email={user.email ?? undefined} />
          <main className="mx-auto max-w-7xl p-6">
            Unable to load departments. Check your departments table permissions.
          </main>
        </>
      );
    }

    departments = data ?? [];

    // Load clinic feature settings
    const { data: settingsData, error: settingsError } =
      await supabase
        .from("clinic_settings")
        .select(
          "clinic_id, booking_mode, doctor_booking_enabled, department_booking_enabled, queue_mode"
        )
        .eq("clinic_id", clinicId)
        .maybeSingle();

    if (settingsError) {
      console.error(
        "Clinic settings loading error:",
        settingsError
      );

      return (
        <>
          <Navbar email={user.email ?? undefined} />
          <main className="mx-auto max-w-7xl p-6">
            <h1 className="text-xl font-semibold">
              Unable to load clinic feature flags.
            </h1>
            <p className="mt-2 text-sm text-red-600">
              {settingsError.message}
            </p>
          </main>
        </>
      );
    }

    initialSettings = settingsData as ClinicSettings | null;

    // Load registration capacity rules
    const { data: capacityData, error: capacityError } =
      await supabase
        .from("registration_capacity_rules")
        .select("*")
        .eq("clinic_id", clinicId);

    if (capacityError) {
      console.error(
        "Registration capacity loading error:",
        capacityError
      );

      return (
        <>
          <Navbar email={user.email ?? undefined} />
          <main className="mx-auto max-w-7xl p-6">
            <h1 className="text-xl font-semibold">
              Unable to load registration capacity settings.
            </h1>
            <p className="mt-2 text-sm text-red-600">
              {capacityError.message}
            </p>
          </main>
        </>
      );
    }

    initialCapacityRules =
      (capacityData ?? []) as RegistrationCapacityRule[];
  }

  return (
    <>
      <Navbar email={user.email ?? undefined} />

      <SettingsClient
        clinics={availableClinics}
        selectedClinicId={clinicId}
        selectedClinicName={selectedClinic?.name ?? null}
        departments={departments}
        isPlatformAdmin={isPlatformAdmin}
        initialSettings={initialSettings}
        initialCapacityRules={initialCapacityRules}
        initialPublicBookingCode={
          selectedClinic?.public_booking_code ?? null
        }
        initialPublicBookingEnabled={
          selectedClinic?.public_booking_enabled ?? false
        }
      />
    </>
  );
}
