import Link from "next/link";
import Navbar from "@/app/components/Navbar";

type Clinic = {
  id: string;
  name: string;
  address: string | null;
  business_type?: string | null;
  is_active: boolean;
};

type DashboardRole =
  | "master_admin"
  | "clinic_admin"
  | "receptionist"
  | "doctor";

type HospitalDashboardProps = {
  clinic: Clinic;
  email?: string;
  role: DashboardRole;
  screenPermissions?: string[];
  doctorName?: string;
};

type DashboardModule = {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: string;
};

const adminModules: DashboardModule[] = [
  {
    key: "team",
    title: "Doctors & Staff",
    description: "Manage doctors and hospital staff.",
    href: "/doctors",
    icon: "♙",
  },
  {
    key: "reservations",
    title: "Appointments",
    description: "View and manage patient appointments.",
    href: "/appointments",
    icon: "▦",
  },
  {
    key: "waitlist",
    title: "Queue Management",
    description: "Manage patient queues and tokens.",
    href: "/queues",
    icon: "◷",
  },
  {
    key: "settings",
    title: "Hospital Settings",
    description: "Manage hospital configuration.",
    href: "/settings",
    icon: "⚙",
  },
];

// These destinations already exist in the application's Navbar navigation.
// The departments permission currently opens the existing Settings module.
const receptionistModules: DashboardModule[] = [
  {
    key: "waitlist",
    title: "Queue Management",
    description: "View and manage the patient waitlist and tokens.",
    href: "/queues",
    icon: "◷",
  },
  {
    key: "reservations",
    title: "Appointments",
    description: "Manage patient appointment bookings.",
    href: "/appointments",
    icon: "▦",
  },
  {
    key: "customers",
    title: "Patients",
    description: "View patient details and visit information.",
    href: "/patients",
    icon: "♙",
  },
  {
    key: "insights",
    title: "Insights",
    description: "View clinic activity and analytics.",
    href: "/insights",
    icon: "▤",
  },
  {
    key: "history",
    title: "History",
    description: "Review previous clinic activity.",
    href: "/history",
    icon: "◷",
  },
  {
    key: "settings",
    title: "Hospital Settings",
    description: "Open the clinic settings available to your account.",
    href: "/settings",
    icon: "⚙",
  },
  {
    key: "departments",
    title: "Department Settings",
    description: "Open the clinic's settings area for department configuration.",
    href: "/settings",
    icon: "▦",
  },
  {
    key: "team",
    title: "Team",
    description: "View team management.",
    href: "/team",
    icon: "♙",
  },
  {
    key: "billing",
    title: "Billing & Plan",
    description: "View the clinic plan.",
    href: "/plan",
    icon: "₹",
  },
];

const doctorModules: DashboardModule[] = [
  {
    key: "appointments",
    title: "My Appointments",
    description: "View appointments assigned to your doctor account.",
    href: "/appointments",
    icon: "▦",
  },
  {
    key: "queue",
    title: "My Queue",
    description: "View queue activity for your assigned clinic and doctor.",
    href: "/queues",
    icon: "◷",
  },
  {
    key: "patients",
    title: "My Patients",
    description: "View patients available to your doctor account.",
    href: "/patients",
    icon: "♙",
  },
];

const metrics = [
  { label: "Doctors", icon: "♙" },
  { label: "Appointments today", icon: "▦" },
  { label: "Patients waiting", icon: "◷" },
  { label: "Active rooms", icon: "⌂" },
];

const roleLabels: Record<DashboardRole, string> = {
  master_admin: "Master Admin · Selected Clinic",
  clinic_admin: "Hospital Administrator",
  receptionist: "Hospital Receptionist",
  doctor: "Doctor Dashboard",
};

export default function HospitalDashboard({
  clinic,
  email,
  role,
  screenPermissions = [],
  doctorName,
}: HospitalDashboardProps) {
  const clinicHref = (path: string) =>
    `${path}?clinicId=${encodeURIComponent(clinic.id)}`;

  const modules =
    role === "master_admin" || role === "clinic_admin"
      ? adminModules
      : role === "doctor"
        ? doctorModules
        : receptionistModules.filter((module) =>
            screenPermissions.includes(module.key)
          );

  const pageDescription =
    role === "doctor" && doctorName
      ? `Welcome, Dr. ${doctorName}. Here is your assigned clinic workspace.`
      : role === "receptionist"
        ? "Your dashboard shows only the screens enabled by your hospital administrator."
        : "Your hospital at a glance.";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Navbar
        email={email}
        displayName={clinic.name}
        role={role}
      />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {roleLabels[role]}
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {clinic.name}
            </h1>

            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {pageDescription}
            </p>

            {clinic.address && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {clinic.address}
              </p>
            )}
          </div>

          {(role === "master_admin" || role === "clinic_admin") && (
            <Link
              href={clinicHref("/appointments")}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              View appointments
            </Link>
          )}
        </section>

        {(role === "master_admin" || role === "clinic_admin") && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Overview</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Hospital activity and key metrics.
                </p>
              </div>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {clinic.is_active ? "Active clinic" : "Inactive clinic"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {metric.label}
                    </p>
                    <span className="text-xl text-blue-600 dark:text-blue-400">
                      {metric.icon}
                    </span>
                  </div>

                  <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Hospital data integration pending
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">
              {role === "receptionist"
                ? "Your permitted screens"
                : role === "doctor"
                  ? "Your assigned workspace"
                  : "Hospital operations"}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {role === "receptionist"
                ? "Only the modules enabled for your account are shown here."
                : role === "doctor"
                  ? "These modules use your assigned doctor and clinic access."
                  : "Access the main modules for this clinic."}
            </p>
          </div>

          {modules.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {modules.map((module) => (
                <Link
                  key={module.key}
                  href={clinicHref(module.href)}
                  className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-700"
                >
                  <span className="text-2xl text-blue-600 dark:text-blue-400">
                    {module.icon}
                  </span>

                  <h3 className="mt-4 font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {module.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                    {module.description}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              No screens have been enabled for this account yet. Please ask your hospital administrator to configure your Team permissions.
            </div>
          )}
        </section>

        <footer className="border-t border-gray-200 pt-5 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          SamayQ · {clinic.name}
        </footer>
      </main>
    </div>
  );
}
