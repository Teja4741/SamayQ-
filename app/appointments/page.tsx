import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/app/components/Navbar";
import AppointmentsClient from "./AppointmentsClient";

export const instant = false;

type SearchParams = Promise<{
  clinicId?: string | string[];
}>;

type ClinicRole = "master_admin" | "clinic_admin" | "receptionist" | "doctor";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/auth/login");

  const { data: platformAdmin, error: adminError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    return <main className="p-8">Unable to verify access.</main>;
  }

  const params = await searchParams;
  const selectedClinicId =
    typeof params.clinicId === "string" ? params.clinicId : undefined;

  let role: ClinicRole = "clinic_admin";
  let clinicId: string | null = null;
  let clinicName = "";

  if (platformAdmin) {
    role = "master_admin";

    if (selectedClinicId) {
      const { data: clinic, error } = await supabase
        .from("clinics")
        .select("id, name")
        .eq("id", selectedClinicId)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !clinic) {
        return (
          <main className="p-8">
            <h1 className="text-xl font-semibold">Clinic unavailable</h1>
          </main>
        );
      }

      clinicId = clinic.id;
      clinicName = clinic.name;
    }
  } else {
    const { data: memberships, error } = await supabase
      .from("clinic_memberships")
      .select("id, clinic_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .in("role", ["administrator", "receptionist", "doctor"]);

    if (error || !memberships || memberships.length !== 1) {
      return (
        <main className="p-8">
          <h1 className="text-xl font-semibold">Access restricted</h1>
          <p className="mt-2 text-slate-500">
            Exactly one active clinic membership is required.
          </p>
        </main>
      );
    }

    const membership = memberships[0];
    clinicId = membership.clinic_id;

    if (membership.role === "receptionist") {
      const { data: permission, error: permissionError } = await supabase
        .from("team_permissions")
        .select("screen")
        .eq("clinic_membership_id", membership.id)
        .eq("clinic_id", membership.clinic_id)
        .eq("screen", "reservations")
        .eq("can_view", true)
        .maybeSingle();

      if (permissionError || !permission) {
        return (
          <main className="p-8">
            <h1 className="text-xl font-semibold">Access restricted</h1>
            <p className="mt-2 text-slate-500">
              You do not have permission to access appointments. Please contact your clinic administrator.
            </p>
            <Link href="/" className="mt-4 inline-block text-violet-600">
              Return to dashboard
            </Link>
          </main>
        );
      }

      role = "receptionist";
    } else if (membership.role === "doctor") {
      const { data: doctor, error: doctorError } = await supabase
        .from("doctors")
        .select("id")
        .eq("profile_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (doctorError || !doctor) {
        return (
          <main className="p-8">
            <h1 className="text-xl font-semibold">Doctor profile unavailable</h1>
            <p className="mt-2 text-slate-500">
              Your account is not linked to an active doctor profile.
            </p>
          </main>
        );
      }

      const { data: assignment, error: assignmentError } = await supabase
        .from("doctor_clinic_assignments")
        .select("clinic_id")
        .eq("doctor_id", doctor.id)
        .eq("clinic_id", membership.clinic_id)
        .eq("is_active", true)
        .maybeSingle();

      if (assignmentError || !assignment) {
        return (
          <main className="p-8">
            <h1 className="text-xl font-semibold">Hospital assignment unavailable</h1>
            <p className="mt-2 text-slate-500">
              You do not have an active doctor assignment for this hospital.
            </p>
          </main>
        );
      }

      role = "doctor";
    } else {
      role = "clinic_admin";
    }

    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id, name")
      .eq("id", clinicId)
      .eq("is_active", true)
      .maybeSingle();

    if (clinicError || !clinic) {
      return (
        <main className="p-8">
          <h1 className="text-xl font-semibold">Clinic unavailable</h1>
        </main>
      );
    }

    clinicName = clinic.name;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-sky-50 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100">
      <Navbar email={user.email ?? undefined} role={role} />

      {!clinicId ? (
        <div className="mx-auto max-w-5xl px-5 py-8">
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
            <h1 className="text-xl font-semibold">Select a clinic first</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Select a clinic from the navigation bar to manage its appointments.
            </p>
          </section>
        </div>
      ) : (
        <AppointmentsClient clinicId={clinicId} clinicName={clinicName} />
      )}
    </main>
  );
}
