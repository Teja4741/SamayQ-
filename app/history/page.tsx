import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/app/components/Navbar";
import HistoryClient from "./HistoryClient";

export const instant = false;

type PageProps = {
  searchParams: Promise<{ clinicId?: string }>;
};

type NavbarRole = "master_admin" | "clinic_admin" | "receptionist" | "doctor";

export default async function HistoryPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/auth/login");

  const params = await searchParams;
  const requestedClinicId = params.clinicId;

  const { data: adminRecord, error: adminError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    return <main className="p-6">Unable to verify administrator access. Please try again.</main>;
  }

  const isPlatformAdmin = Boolean(adminRecord);
  const { data: memberships, error: membershipError } = await supabase
    .from("clinic_memberships")
    .select("id, clinic_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (membershipError) {
    return <main className="p-6">Unable to verify clinic access. Please try again.</main>;
  }

  const activeMemberships = memberships ?? [];
  const allowedClinicIds = [...new Set(activeMemberships.map((item) => item.clinic_id))];
  const currentMembership = requestedClinicId
    ? activeMemberships.find((item) => item.clinic_id === requestedClinicId)
    : activeMemberships.length === 1
      ? activeMemberships[0]
      : activeMemberships[0];

  const navbarRole: NavbarRole = isPlatformAdmin
    ? "master_admin"
    : currentMembership?.role === "receptionist"
      ? "receptionist"
      : currentMembership?.role === "doctor"
        ? "doctor"
        : "clinic_admin";

  let clinicId: string | null = null;

  if (isPlatformAdmin) {
    clinicId = requestedClinicId || null;
  } else {
    if (allowedClinicIds.length === 0) {
      return <main className="p-6">You do not have access to any clinic.</main>;
    }

    if (requestedClinicId) {
      if (!allowedClinicIds.includes(requestedClinicId)) {
        return <main className="p-6">You do not have access to this clinic.</main>;
      }
      clinicId = requestedClinicId;
    } else if (allowedClinicIds.length === 1) {
      clinicId = allowedClinicIds[0];
    }
  }

  // Receptionists must have the History screen permission for the selected clinic.
  if (!isPlatformAdmin && currentMembership?.role === "receptionist" && clinicId) {
    const { data: historyPermission, error: permissionError } = await supabase
      .from("team_permissions")
      .select("screen")
      .eq("clinic_membership_id", currentMembership.id)
      .eq("clinic_id", clinicId)
      .eq("screen", "history")
      .eq("can_view", true)
      .maybeSingle();

    if (permissionError || !historyPermission) {
      return <main className="p-6">You do not have permission to view clinic history.</main>;
    }
  }

  let clinicQuery = supabase
    .from("clinics")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  if (!isPlatformAdmin) clinicQuery = clinicQuery.in("id", allowedClinicIds);

  const { data: clinics, error: clinicsError } = await clinicQuery;

  if (clinicsError) {
    return <main className="p-6">Unable to load clinics. Please try again.</main>;
  }

  const availableClinics = clinics ?? [];
  const selectedClinic = availableClinics.find((clinic) => clinic.id === clinicId);

  if (clinicId && !selectedClinic) {
    return <main className="p-6">Clinic not found or access denied.</main>;
  }

  return (
    <>
      <Navbar email={user.email ?? undefined} role={navbarRole} />
      <main className="mx-auto max-w-7xl p-4 md:p-8">
        {!clinicId ? (
          <section className="rounded-xl border bg-white p-6">
            <p className="text-sm text-gray-500">Dashboard / History</p>
            <h1 className="mt-2 text-2xl font-semibold">History</h1>
            <p className="mt-2 text-gray-600">Select a clinic to view its history.</p>
            {availableClinics.length === 0 ? (
              <p className="mt-5 text-sm text-gray-500">No active clinics are available.</p>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {availableClinics.map((clinic) => (
                  <Link
                    key={clinic.id}
                    href={`/history?clinicId=${clinic.id}`}
                    className="rounded-lg border p-4 transition hover:bg-gray-50"
                  >
                    <span className="font-medium">{clinic.name}</span>
                    <span className="mt-1 block text-sm text-gray-500">View history →</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        ) : (
          <HistoryClient
            clinicId={clinicId}
            clinicName={selectedClinic?.name ?? "Clinic"}
            clinics={isPlatformAdmin ? availableClinics : []}
            isPlatformAdmin={isPlatformAdmin}
          />
        )}
      </main>
    </>
  );
}
