
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/app/components/Navbar";
import DoctorsClient from "./DoctorsClient";

type SearchParams = Promise<{
  clinicId?: string | string[];
}>;

type DoctorsPageProps = {
  searchParams: SearchParams;
};

async function DoctorsPageContent({
  searchParams,
}: DoctorsPageProps) {
  // 1. Create Supabase client
  const supabase = await createClient();

  // 2. Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  // 3. Check Master Admin access
  const {
    data: platformAdmin,
    error: adminError,
  } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error(
      "Platform admin verification failed:",
      adminError
    );

    return (
      <main className="p-8">
        Unable to verify access. Please try again.
      </main>
    );
  }

  // 4. Read selected clinic from URL
  const params = await searchParams;

  const selectedClinicId =
    typeof params.clinicId === "string"
      ? params.clinicId
      : undefined;

  let role: "master_admin" | "clinic_admin" = "clinic_admin";
  let clinicId: string | null = null;

  // 5. Resolve clinic access
  if (platformAdmin) {
    role = "master_admin";

    if (selectedClinicId) {
      clinicId = selectedClinicId;
    }
  } else {
    // Clinic Admin
    const {
      data: memberships,
      error: membershipError,
    } = await supabase
      .from("clinic_memberships")
      .select("clinic_id")
      .eq("user_id", user.id)
      .eq("role", "administrator")
      .eq("is_active", true);

    if (
      membershipError ||
      !memberships ||
      memberships.length !== 1
    ) {
      return (
        <main className="p-8">
          <h1 className="text-xl font-semibold">
            Access restricted
          </h1>

          <p className="mt-2 text-slate-500">
            An active clinic administrator membership is required.
          </p>
        </main>
      );
    }

    clinicId = memberships[0].clinic_id;
  }

  // 6. Render clinic selection for Master Admin
  if (!clinicId) {
    return (
      <>
        <Navbar
          email={user.email ?? undefined}
          role={role}
        />

        <main className="mx-auto max-w-5xl px-5 py-8">
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
            <h1 className="text-xl font-semibold">
              Select a clinic first
            </h1>

            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Select a clinic from the navigation bar
              to manage its doctors.
            </p>
          </section>
        </main>
      </>
    );
  }

  // 7. Fetch clinic details
  const {
    data: clinic,
    error: clinicError,
  } = await supabase
    .from("clinics")
    .select("id, name, is_active")
    .eq("id", clinicId)
    .maybeSingle();

  if (
    clinicError ||
    !clinic ||
    !clinic.is_active
  ) {
    console.error("Clinic loading failed:", clinicError);

    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold">
          Clinic unavailable
        </h1>

        <p className="mt-2 text-slate-500">
          The selected clinic does not exist or is inactive.
        </p>
      </main>
    );
  }

  // 8. Fetch booking configuration from clinic_settings
  const {
    data: settings,
    error: settingsError,
  } = await supabase
    .from("clinic_settings")
    .select(
      "booking_mode, doctor_booking_enabled, department_booking_enabled"
    )
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (settingsError) {
    console.error(
      "Clinic booking settings loading failed:",
      settingsError
    );

    return (
      <>
        <Navbar
          email={user.email ?? undefined}
          role={role}
        />

        <main className="mx-auto max-w-5xl px-5 py-8">
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-xl font-semibold">
              Unable to load clinic configuration
            </h1>

            <p className="mt-2 text-sm text-red-700">
              Please check the clinic settings permissions and try again.
            </p>
          </section>
        </main>
      </>
    );
  }

  // 9. Determine the effective booking model
  const bookingMode = settings?.booking_mode ?? null;

  const isDoctorBookingEnabled =
    bookingMode === "doctor" ||
    (
      bookingMode === "custom" &&
      settings?.doctor_booking_enabled === true &&
      settings?.department_booking_enabled === false
    );

  const isConfigured = Boolean(settings);

  // 10. Render page
  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-sky-50 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100">

      <Navbar
        email={user.email ?? undefined}
        role={role}
      />

      {!isConfigured ? (
        // Configuration missing
        <div className="mx-auto max-w-5xl px-5 py-8">
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
            <h1 className="text-xl font-semibold">
              Clinic configuration unavailable
            </h1>

            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              No booking configuration has been saved for {clinic.name}.
              Please configure its booking mode in Settings.
            </p>
          </section>
        </div>
      ) : !isDoctorBookingEnabled ? (
        // Department-wise clinic restriction
        <div className="mx-auto max-w-5xl px-5 py-8">
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
            <h1 className="text-xl font-semibold">
              Doctors management unavailable
            </h1>

            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              This clinic uses department-wise appointment
              booking. Doctors management is available only
              for doctor-wise clinics.
            </p>
          </section>
        </div>
      ) : (
        // Doctor-wise clinic
        <DoctorsClient
          clinicId={clinic.id}
          clinicName={clinic.name}
        />
      )}
    </main>
  );
}

// 11. Suspense boundary
export default function DoctorsPage({
  searchParams,
}: DoctorsPageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-8">
          <p className="text-slate-500">
            Loading doctors management...
          </p>
        </main>
      }
    >
      <DoctorsPageContent
        searchParams={searchParams}
      />
    </Suspense>
  );
}
