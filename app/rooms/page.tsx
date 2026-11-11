
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import { getClinicRoomsDashboardData } from "./actions";
import Navbar from "@/app/components/Navbar";
import RoomsDashboardClient from "./components/RoomsDashboardClient";

export const instant = false;

type RoomsPageProps = {
  searchParams: Promise<{
    clinicId?: string;
  }>;
};

type Membership = {
  clinic_id: string;
  role: string;
};

export default async function RoomsPage({
  searchParams,
}: RoomsPageProps) {
  const { clinicId } = await searchParams;
  const supabase = await createClient();

  // 1. Authenticate user.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  // 2. Check platform administrator access.
  const { data: platformAdmin, error: adminError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("Platform admin check error:", adminError.message);
    throw new Error("Unable to verify platform administrator access.");
  }

  const isPlatformAdmin = Boolean(platformAdmin);

  let accessibleClinicIds: string[] = [];
  let memberships: Membership[] = [];

  // 3. Load accessible hospitals.
  if (isPlatformAdmin) {
    const { data: clinics, error } = await supabase
      .from("clinics")
      .select("id")
      .eq("is_active", true);

    if (error) {
      throw new Error(`Unable to load hospitals: ${error.message}`);
    }

    accessibleClinicIds = (clinics ?? []).map((clinic) => clinic.id);
  } else {
    const { data, error } = await supabase
      .from("clinic_memberships")
      .select("clinic_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .in("role", ["administrator", "receptionist"]);

    if (error) {
      throw new Error(
        `Unable to verify hospital access: ${error.message}`
      );
    }

    memberships = data ?? [];

    accessibleClinicIds = [
      ...new Set(memberships.map((item) => item.clinic_id)),
    ];
  }

  // 4. Check hospital access.
  if (accessibleClinicIds.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 dark:bg-slate-950">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          No hospital assigned
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Your account does not have access to any active hospital.
        </p>
      </main>
    );
  }

  // 5. Load accessible hospitals.
  const { data: clinics, error: clinicsError } = await supabase
    .from("clinics")
    .select("id, name, address")
    .in("id", accessibleClinicIds)
    .eq("is_active", true)
    .order("name");

  if (clinicsError) {
    throw new Error(
      `Unable to load hospital information: ${clinicsError.message}`
    );
  }

  const availableClinics = clinics ?? [];

  if (availableClinics.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 dark:bg-slate-950">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          No active hospitals available
        </h1>
      </main>
    );
  }

  // 6. Select or validate hospital.
  if (!clinicId) {
    if (availableClinics.length === 1) {
      redirect(`/rooms?clinicId=${availableClinics[0].id}`);
    }

    return (
      <main className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950 sm:p-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Select your hospital
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Choose a hospital to view its rooms.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {availableClinics.map((clinic) => (
              <Link
                key={clinic.id}
                href={`/rooms?clinicId=${clinic.id}`}
                className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-violet-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  {clinic.name}
                </h2>

                {clinic.address && (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {clinic.address}
                  </p>
                )}

                <p className="mt-4 text-sm font-medium text-violet-600 dark:text-violet-400">
                  Open rooms →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const selectedClinic = availableClinics.find(
    (clinic) => clinic.id === clinicId
  );

  if (!selectedClinic) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 dark:bg-slate-950">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Hospital access denied
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          You do not have access to this hospital or it is inactive.
        </p>

        <Link
          href="/rooms"
          className="mt-4 inline-block text-sm font-medium text-violet-600"
        >
          Select another hospital
        </Link>
      </main>
    );
  }

  // 7. Determine Navbar role.
  const selectedMembership = memberships.find(
    (membership) => membership.clinic_id === selectedClinic.id
  );

  const userRole = isPlatformAdmin
    ? "master_admin"
    : selectedMembership?.role === "receptionist"
      ? "receptionist"
      : "clinic_admin";

  // 8. Load room dashboard data.
  const dashboardData = await getClinicRoomsDashboardData(
    selectedClinic.id
  );

  // 9. Render one Navbar and the client dashboard.
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar
        email={user.email ?? undefined}
        displayName={selectedClinic.name}
        role={userRole}
      />

      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10">
        <RoomsDashboardClient
          clinicId={selectedClinic.id}
          initialData={dashboardData}
        />
      </main>
    </div>
  );
}
