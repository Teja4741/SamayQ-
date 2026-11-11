
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HospitalDashboard from "@/app/components/HospitalDashboard";

export const instant = false;

export default async function HospitalDashboardPage() {
  const supabase = await createClient();

  // 1. Verify the logged-in user.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  // 2. Keep Master Admin on the platform dashboard.
  const {
    data: platformAdmin,
    error: platformAdminError,
  } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (platformAdminError) {
    console.error(
      "Unable to verify platform admin:",
      platformAdminError.message
    );

    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold">
          Unable to verify access
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Please check your platform administrator permissions.
        </p>
      </main>
    );
  }

  if (platformAdmin) {
    redirect("/");
  }

  // 3. Find the Hospital Admin's active clinic membership.
  const { data: memberships, error: membershipError } =
    await supabase
      .from("clinic_memberships")
      .select("clinic_id")
      .eq("user_id", user.id)
      .eq("role", "administrator")
      .eq("is_active", true);

  if (membershipError) {
    console.error(
      "Unable to load clinic membership:",
      membershipError.message
    );

    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold">
          Hospital access unavailable
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          We could not verify your hospital membership.
        </p>
      </main>
    );
  }

  if (!memberships || memberships.length === 0) {
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold">
          No hospital assigned
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Your account does not have an active hospital administrator membership.
        </p>
      </main>
    );
  }

  if (memberships.length > 1) {
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold">
          Multiple hospital assignments found
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          This account currently has more than one active hospital assignment.
        </p>
      </main>
    );
  }

  const clinicId = memberships[0].clinic_id;

  // 4. Load only the clinic assigned to this administrator.
  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .select("id, name, address, business_type, is_active")
    .eq("id", clinicId)
    .eq("is_active", true)
    .maybeSingle();

  if (clinicError || !clinic) {
    console.error(
      "Unable to load assigned clinic:",
      clinicError?.message
    );

    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold">
          Hospital information unavailable
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Check your clinic access permissions and confirm that your hospital is active.
        </p>
      </main>
    );
  }

  // 5. Render the reusable hospital dashboard.
  return (
    <HospitalDashboard
      clinic={clinic}
      email={user.email ?? undefined}
      role="clinic_admin"
    />
  );
}
