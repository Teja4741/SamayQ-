import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/app/components/Navbar";
import TeamManagementClient from "./TeamManagementClient";

export const instant = false;

type SearchParams = Promise<{ clinicId?: string | string[] }>;

export default async function TeamPage({ searchParams }: { searchParams: SearchParams }) {
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
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-xl font-semibold">Unable to verify access</h1>
        <p className="mt-2 text-sm text-slate-500">Please try again or contact your administrator.</p>
      </main>
    );
  }

  const params = await searchParams;
  const selectedClinicId = typeof params.clinicId === "string" ? params.clinicId : undefined;
  let clinicId: string | null = null;
  let clinicName = "";
  const role = platformAdmin ? "master_admin" : "clinic_admin";

  if (platformAdmin) {
    if (selectedClinicId) {
      const { data: clinic, error } = await supabase
        .from("clinics")
        .select("id, name")
        .eq("id", selectedClinicId)
        .maybeSingle();

      if (error || !clinic) {
        return (
          <main className="min-h-screen p-8">
            <h1 className="text-xl font-semibold">Clinic unavailable</h1>
            <p className="mt-2 text-sm text-slate-500">The selected clinic could not be found.</p>
            <Link href="/" className="mt-4 inline-block text-violet-600 hover:underline">Return to dashboard</Link>
          </main>
        );
      }
      clinicId = clinic.id;
      clinicName = clinic.name;
    }
  } else {
    const { data: membership, error: membershipError } = await supabase
      .from("clinic_memberships")
      .select("clinic_id")
      .eq("user_id", user.id)
      .eq("role", "administrator")
      .eq("is_active", true)
      .limit(2);

    if (membershipError || !membership || membership.length !== 1) {
      return (
        <main className="min-h-screen p-8">
          <h1 className="text-xl font-semibold">Access restricted</h1>
          <p className="mt-2 text-sm text-slate-500">
            An active administrator membership for exactly one clinic is required to manage this team.
          </p>
          <Link href="/" className="mt-4 inline-block text-violet-600 hover:underline">Return to dashboard</Link>
        </main>
      );
    }

    clinicId = membership[0].clinic_id;
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id, name")
      .eq("id", clinicId)
      .maybeSingle();

    if (clinicError || !clinic) {
      return (
        <main className="min-h-screen p-8">
          <h1 className="text-xl font-semibold">Clinic unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">The clinic could not be loaded.</p>
        </main>
      );
    }
    clinicName = clinic.name;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-sky-50 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100">
      <Navbar email={user.email ?? undefined} role={role} />
      {!clinicId && role === "master_admin" ? (
        <div className="mx-auto max-w-5xl px-5 py-8">
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
            <h1 className="text-xl font-semibold">Select a clinic first</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Use the clinic selector in the navigation bar, then open Team to manage that clinic's members.
            </p>
          </section>
        </div>
      ) : (
        <div className="mx-auto max-w-[1440px] px-5 py-7 lg:px-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Management / Team</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Team</h1>
              <p className="mt-2 text-sm text-slate-500">
                Invite people, choose which screens they can open, and scope them to branches and departments.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {clinicName}
            </div>
          </div>
          <TeamManagementClient clinicId={clinicId!} />
        </div>
      )}
    </main>
  );
}
