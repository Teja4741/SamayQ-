import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/app/components/Navbar";
import HospitalDashboard from "@/app/components/HospitalDashboard";

export const instant = false;

type HomeProps = {
  searchParams: Promise<{
    clinicId?: string | string[];
  }>;
};

type ClinicRecord = {
  id: string;
  name: string;
  address: string | null;
  business_type: string | null;
  is_active: boolean;
};

function AccessMessage({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6fc] p-6 dark:bg-slate-950">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{message}</p>
        <Link
          href="/auth/login"
          className="mt-6 inline-flex rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700"
        >
          Return to sign in
        </Link>
      </div>
    </main>
  );
}

const platformMetrics = [
  { label: "Active clinics", icon: "⌂" },
  { label: "Total doctors", icon: "♙" },
  { label: "Appointments today", icon: "▦" },
  { label: "Patients waiting", icon: "◷" },
];

const platformModules = [
  {
    title: "Clinic management",
    description: "Manage clinics and their configurations.",
    icon: "⌂",
    href: "/clinics",
  },
  {
    title: "Doctors & staff",
    description: "Manage doctor profiles and staff access.",
    icon: "♙",
    href: "/doctors",
  },
  {
    title: "Appointments",
    description: "View bookings and appointment schedules.",
    icon: "▦",
    href: "/appointments",
  },
  {
    title: "Queue management",
    description: "Monitor tokens, rooms and waiting patients.",
    icon: "☷",
    href: "/queues",
  },
];

export default async function Home({ searchParams }: HomeProps) {
  const supabase = await createClient();

  // 1. Authenticate the user.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  // 2. Master Admin always takes precedence over clinic memberships.
  const { data: platformAdmin, error: platformAdminError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (platformAdminError) {
    console.error("Platform admin lookup failed:", platformAdminError);
    return (
      <AccessMessage
        title="Unable to verify access"
        message="The application could not verify your platform administrator permissions. Please try again."
      />
    );
  }

  // 3. Preserve the existing Master Admin platform dashboard.
  if (platformAdmin) {
  const params = await searchParams;

  const selectedClinicId =
    typeof params.clinicId === "string" &&
      params.clinicId.trim().length > 0
      ? params.clinicId
      : undefined;

  if (selectedClinicId) {
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id, name, address, business_type, is_active")
      .eq("id", selectedClinicId)
      .maybeSingle();

    if (clinicError || !clinic) {
      console.error("Selected clinic lookup failed:", clinicError);
      return (
        <AccessMessage
          title="Clinic unavailable"
          message="The selected clinic could not be loaded. It may no longer exist or may be unavailable."
        />
      );
    }

    return (
      <HospitalDashboard
        clinic={clinic as ClinicRecord}
        email={user.email ?? undefined}
        role="master_admin"
      />
    );
  }

  const { count: activeClinicCount, error: clinicCountError } =
    await supabase
      .from("clinics")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

  if (clinicCountError) {
    console.error("Active clinic count failed:", clinicCountError);
  }

  return (
    <main className="min-h-screen bg-[#f5f6fc] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar email={user.email ?? undefined} role="master_admin" />

      <div className="mx-auto max-w-[1440px] px-5 py-7 lg:px-10 lg:py-9">
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
              Dashboard
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Your healthcare platform at a glance.
            </p>
          </div>
          <Link
            href="/clinics"
            className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            Manage clinics <span className="ml-2">→</span>
          </Link>
        </section>

        <div className="mt-7 flex gap-2 border-b border-slate-200 dark:border-slate-800">
          <span className="rounded-t-lg border-b-2 border-violet-600 bg-white px-5 py-3 text-sm font-semibold dark:bg-slate-900">
            Overview
          </span>
          <span className="px-5 py-3 text-sm text-slate-500">
            Platform activity
          </span>
        </div>

        <section className="mt-7">
          <h2 className="mb-4 text-base font-semibold">Platform overview</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {platformMetrics.map((metric) => (
              <article
                key={metric.label}
                className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_2px_5px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-lg text-violet-600 dark:bg-violet-950">
                    {metric.icon}
                  </span>
                </div>
                <p className="mt-5 text-3xl font-medium tracking-tight">
                  {metric.label === "Active clinics"
                    ? clinicCountError
                      ? "—"
                      : (activeClinicCount ?? 0)
                    : "—"}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {metric.label === "Active clinics"
                    ? "Currently active clinics"
                    : "Live data integration pending"}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-7 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_2px_5px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xl text-violet-600">▤</span>
              <h2 className="font-semibold">Platform usage</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800">
              Usage data not connected
            </span>
          </div>
          <div className="grid gap-7 p-5 md:grid-cols-2 md:p-6">
            <div>
              <p className="text-sm text-slate-500">Notification consumption</p>
              <p className="mt-3 text-3xl font-medium">—</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full w-0 rounded-full bg-violet-600" />
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Connect billing and notification records to show usage.
              </p>
            </div>
            <div className="border-t border-slate-100 pt-5 md:border-l md:border-t-0 md:pl-7 md:pt-0 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-500">Platform operations</p>
              <div className="mt-4 space-y-4">
                {[
                  "Clinic configuration",
                  "Staff and role management",
                  "Appointments and queue activity",
                ].map((label) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 dark:border-slate-800"
                  >
                    <span className="text-sm">{label}</span>
                    <span className="text-slate-400">→</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Management</h2>
            <span className="text-xs text-slate-500">Quick access</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {platformModules.map((module) => (
              <Link
                key={module.title}
                href={module.href}
                className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-violet-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl text-violet-700 dark:bg-violet-950">
                  {module.icon}
                </span>
                <div className="flex-1">
                  <h3 className="font-semibold">{module.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500">
                    {module.description}
                  </p>
                </div>
                <span className="text-lg text-slate-400 transition group-hover:translate-x-1 group-hover:text-violet-600">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <footer className="mt-10 border-t border-slate-200 py-5 text-xs text-slate-400 dark:border-slate-800">
          SamayQ · Platform administration
        </footer>
      </div>
    </main>
  );
  }

// 4. Resolve any active clinic membership for non-platform users.
const { data: memberships, error: membershipsError } = await supabase
  .from("clinic_memberships")
  .select("id, clinic_id, role")
  .eq("user_id", user.id)
  .eq("is_active", true)
  .in("role", ["administrator", "receptionist", "doctor"]);

if (membershipsError) {
  console.error("Clinic membership lookup failed:", membershipsError);
  return (
    <AccessMessage
      title="Unable to verify hospital access"
      message="The application could not read your active clinic membership. Please contact your hospital administrator."
    />
  );
}

if (!memberships || memberships.length === 0) {
  return (
    <AccessMessage
      title="Access restricted"
      message="This account is not assigned to an active hospital membership. Please contact your hospital administrator."
    />
  );
}

if (memberships.length > 1) {
  return (
    <AccessMessage
      title="Multiple hospital assignments found"
      message="This account belongs to more than one active clinic. Ask your platform administrator to configure clinic selection before continuing."
    />
  );
}

const membership = memberships[0];
const membershipRole = membership.role as
  | "administrator"
  | "receptionist"
  | "doctor";

// 5. Load the clinic assigned to this membership.
const { data: clinic, error: clinicError } = await supabase
  .from("clinics")
  .select("id, name, address, business_type, is_active")
  .eq("id", membership.clinic_id)
  .maybeSingle();

if (clinicError || !clinic || !clinic.is_active) {
  console.error("Clinic lookup failed or clinic is inactive:", clinicError);
  return (
    <AccessMessage
      title="Clinic unavailable"
      message="Your assigned clinic could not be loaded or is inactive. Please contact your hospital administrator."
    />
  );
}

// 6. Clinic Administrators receive the complete clinic dashboard.
if (membershipRole === "administrator") {
  return (
    <HospitalDashboard
      clinic={clinic as ClinicRecord}
      email={user.email ?? undefined}
      role="clinic_admin"
    />
  );
}

// 7. Receptionists receive only the screens enabled in team_permissions.
if (membershipRole === "receptionist") {
  const { data: permissionRows, error: permissionsError } = await supabase
    .from("team_permissions")
    .select("screen, can_view")
    .eq("clinic_membership_id", membership.id)
    .eq("clinic_id", clinic.id)
    .eq("can_view", true);

  if (permissionsError) {
    console.error("Receptionist permission lookup failed:", permissionsError);
    return (
      <AccessMessage
        title="Unable to load your permissions"
        message="Your account is active, but SamayQ could not load your screen permissions. Please contact your hospital administrator."
      />
    );
  }

  const screenPermissions = (permissionRows ?? []).map((row) => row.screen);

  return (
    <HospitalDashboard
      clinic={clinic as ClinicRecord}
      email={user.email ?? undefined}
      role="receptionist"
      screenPermissions={screenPermissions}
    />
  );
}

// 8. Doctors must have a linked doctor profile and an active assignment
// in the clinic recorded by their clinic_membership.
const { data: doctor, error: doctorError } = await supabase
  .from("doctors")
  .select("id, full_name")
  .eq("profile_id", user.id)
  .eq("is_active", true)
  .maybeSingle();

if (doctorError || !doctor) {
  console.error("Doctor profile lookup failed:", doctorError);
  return (
    <AccessMessage
      title="Doctor profile not linked"
      message="Your doctor membership exists, but it is not linked to an active doctor profile. Ask your hospital administrator to check your doctor invitation and profile assignment."
    />
  );
}

const { data: doctorAssignment, error: assignmentError } = await supabase
  .from("doctor_clinic_assignments")
  .select("id")
  .eq("doctor_id", doctor.id)
  .eq("clinic_id", clinic.id)
  .eq("is_active", true)
  .limit(1)
  .maybeSingle();

if (assignmentError || !doctorAssignment) {
  console.error("Doctor clinic assignment lookup failed:", assignmentError);
  return (
    <AccessMessage
      title="No active doctor assignment"
      message="Your doctor profile is not actively assigned to this clinic. Please contact your hospital administrator."
    />
  );
}

return (
  <HospitalDashboard
    clinic={clinic as ClinicRecord}
    email={user.email ?? undefined}
    role="doctor"
    doctorName={doctor.full_name ?? undefined}
  />
);
}
