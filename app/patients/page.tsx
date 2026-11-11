
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/app/components/Navbar";
import PatientsClient from "./PatientsClient";

export const instant = false;

type SearchParams = Promise<{
  clinicId?: string | string[];
}>;

type AppRole = "master_admin" | "clinic_admin" | "receptionist" | "doctor";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

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
    typeof params.clinicId === "string"
      ? params.clinicId
      : undefined;

  let role: AppRole = "clinic_admin";
  let clinicId: string | null = null;
  let clinicName = "";

  if (platformAdmin) {
    role = "master_admin";

    if (selectedClinicId) {
      const { data: clinic, error } = await supabase
        .from("clinics")
        .select("id, name")
        .eq("id", selectedClinicId)
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
      .select("clinic_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (error || !memberships || memberships.length !== 1) {
      return (
        <main className="p-8">
          <h1 className="text-xl font-semibold">Access restricted</h1>
          <p className="mt-2 text-slate-500">
            An active clinic membership is required to view patients.
          </p>
        </main>
      );
    }

    const membership = memberships[0];

    if (
      membership.role !== "administrator" &&
      membership.role !== "receptionist" &&
      membership.role !== "doctor"
    ) {
      return (
        <main className="p-8">
          <h1 className="text-xl font-semibold">Access restricted</h1>
        </main>
      );
    }

    role =
      membership.role === "administrator"
        ? "clinic_admin"
        : membership.role;

    clinicId = membership.clinic_id;

    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id, name")
      .eq("id", clinicId)
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
              Select a clinic from the navigation bar to view its patients.
            </p>
          </section>
        </div>
      ) : (
        <PatientsClient
          clinicId={clinicId}
          clinicName={clinicName}
        />
      )}
    </main>
  );
}
