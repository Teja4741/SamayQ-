import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/app/components/Navbar";
import AccountClient from "@/app/account/AccountClient";

export const instant = false;

type NavbarRole = "master_admin" | "clinic_admin" | "receptionist" | "doctor";

export default async function AccountPage() {
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
    console.error("Platform admin lookup failed:", adminError);
  }

  const { data: membership, error: membershipError } = await supabase
    .from("clinic_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error("Account membership lookup failed:", membershipError);
  }

  const navbarRole: NavbarRole = platformAdmin
    ? "master_admin"
    : membership?.role === "receptionist"
      ? "receptionist"
      : membership?.role === "doctor"
        ? "doctor"
        : "clinic_admin";

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Account profile query failed:", {
      code: profileError.code,
      message: profileError.message,
      details: profileError.details,
      hint: profileError.hint,
    });

    return (
      <>
        <Navbar email={user.email ?? undefined} role={navbarRole} />
        <main className="mx-auto max-w-4xl p-6">
          <p className="mb-2 text-sm text-gray-500">Dashboard / Account</p>
          <h1 className="text-3xl font-semibold">Account Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your personal details, email address, and account security.
          </p>
          <section className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <h2 className="font-semibold text-red-800">Unable to load your profile</h2>
            <p className="mt-2 text-sm text-red-700">Supabase returned the following error:</p>
            <pre className="mt-4 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white p-4 text-sm text-gray-800">
              {JSON.stringify({
                code: profileError.code,
                message: profileError.message,
                details: profileError.details,
                hint: profileError.hint,
              }, null, 2)}
            </pre>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar email={user.email ?? undefined} role={navbarRole} />
      <main className="min-h-screen bg-[#f8f9ff] px-5 py-8 text-[#171a2b] md:px-10">
        <div className="mx-auto max-w-4xl">
          <p className="mb-2 text-sm text-[#65718a]">Dashboard / Account</p>
          <h1 className="text-3xl font-semibold">Account Settings</h1>
          <p className="mt-2 text-sm text-[#65718a]">
            Manage your personal details, email address, and account security.
          </p>
          <AccountClient
            email={user.email ?? ""}
            fullName={profile?.full_name ?? ""}
            phone={profile?.phone ?? ""}
            isEmailVerified={Boolean(user.email_confirmed_at)}
          />
        </div>
      </main>
    </>
  );
}
