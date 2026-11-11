import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import {
  getClinicQueueData,
  getClinicQueueFormOptions,
} from "./actions";

import QueuePageClient from "./QueuePageClient";

export const instant = false;

type QueuePageProps = {
  searchParams: Promise<{
    clinicId?: string;
  }>;
};

type Membership = {
  clinic_id: string;
  role: string;
};

export default async function QueuePage({
  searchParams,
}: QueuePageProps) {
  const { clinicId } = await searchParams;
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
    console.error("Platform admin check error:", adminError.message);
    throw new Error("Unable to verify platform administrator access.");
  }

  const isPlatformAdmin = Boolean(platformAdmin);
  let accessibleClinicIds: string[] = [];
  let memberships: Membership[] = [];

  if (isPlatformAdmin) {
    const { data: clinics, error } = await supabase
      .from("clinics")
      .select("id")
      .eq("is_active", true);

    if (error) throw new Error(`Unable to load clinics: ${error.message}`);
    accessibleClinicIds = (clinics ?? []).map((clinic) => clinic.id);
  } else {
    const { data: membershipData, error } = await supabase
      .from("clinic_memberships")
      .select("clinic_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .in("role", ["administrator", "receptionist", "doctor"]);

    if (error) {
      throw new Error(`Unable to verify hospital access: ${error.message}`);
    }

    memberships = membershipData ?? [];
    accessibleClinicIds = [
      ...new Set(memberships.map((membership) => membership.clinic_id)),
    ];

    // A doctor must also have an active doctor-to-clinic assignment.
    const doctorMemberships = memberships.filter(
      (membership) => membership.role === "doctor"
    );

    if (doctorMemberships.length > 0) {
      const { data: doctor, error: doctorError } = await supabase
        .from("doctors")
        .select("id")
        .eq("profile_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (doctorError) {
        throw new Error(`Unable to verify doctor profile: ${doctorError.message}`);
      }

      if (!doctor) {
        accessibleClinicIds = accessibleClinicIds.filter(
          (id) => !doctorMemberships.some((membership) => membership.clinic_id === id)
        );
      } else {
        const { data: assignments, error: assignmentError } = await supabase
          .from("doctor_clinic_assignments")
          .select("clinic_id")
          .eq("doctor_id", doctor.id)
          .eq("is_active", true)
          .in("clinic_id", doctorMemberships.map((membership) => membership.clinic_id));

        if (assignmentError) {
          throw new Error(`Unable to verify doctor clinic assignment: ${assignmentError.message}`);
        }

        const assignedClinicIds = new Set(
          (assignments ?? []).map((assignment) => assignment.clinic_id)
        );
        accessibleClinicIds = accessibleClinicIds.filter((id) =>
          !doctorMemberships.some((membership) => membership.clinic_id === id) ||
          assignedClinicIds.has(id)
        );
      }
    }
  }

  if (accessibleClinicIds.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 dark:bg-gray-950">
        <h1 className="text-xl font-semibold">No hospital assigned</h1>
        <p className="mt-2 text-sm text-gray-500">
          Your account does not have access to any active hospital.
        </p>
      </main>
    );
  }

  const { data: clinics, error: clinicsError } = await supabase
    .from("clinics")
    .select("id, name, address")
    .in("id", accessibleClinicIds)
    .eq("is_active", true)
    .order("name");

  if (clinicsError) {
    throw new Error(`Unable to load hospital information: ${clinicsError.message}`);
  }

  const availableClinics = clinics ?? [];

  if (availableClinics.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 dark:bg-gray-950">
        <h1 className="text-xl font-semibold">No active hospitals available</h1>
      </main>
    );
  }

  if (clinicId) {
    const selectedClinic = availableClinics.find((clinic) => clinic.id === clinicId);

    if (!selectedClinic) {
      return (
        <main className="min-h-screen bg-gray-50 p-8 dark:bg-gray-950">
          <h1 className="text-xl font-semibold">Hospital access denied</h1>
          <p className="mt-2 text-sm text-gray-500">
            You do not have access to this hospital or it is inactive.
          </p>
          <Link href="/queues" className="mt-4 inline-block text-sm font-medium text-blue-600">
            Select another hospital
          </Link>
        </main>
      );
    }

    const selectedMembership = memberships.find(
      (membership) => membership.clinic_id === selectedClinic.id
    );

    const userRole = isPlatformAdmin
      ? "master_admin"
      : selectedMembership?.role === "receptionist"
        ? "receptionist"
        : selectedMembership?.role === "doctor"
          ? "doctor"
          : "clinic_admin";

    const [queueData, formOptions] = await Promise.all([
      getClinicQueueData(selectedClinic.id),
      getClinicQueueFormOptions(selectedClinic.id),
    ]);

    return (
      <QueuePageClient
        clinic={selectedClinic}
        queueData={queueData}
        formOptions={formOptions}
        email={user.email ?? undefined}
        role={userRole}
      />
    );
  }

  if (availableClinics.length === 1) {
    redirect(`/queues?clinicId=${availableClinics[0].id}`);
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 dark:bg-gray-950 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Select your hospital
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Choose a hospital to manage its patient queue.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {availableClinics.map((clinic) => (
            <Link
              key={clinic.id}
              href={`/queues?clinicId=${clinic.id}`}
              className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-blue-400 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              <h2 className="font-semibold text-gray-900 dark:text-white">{clinic.name}</h2>
              {clinic.address && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{clinic.address}</p>
              )}
              <p className="mt-4 text-sm font-medium text-blue-600 dark:text-blue-400">
                Open queue →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
