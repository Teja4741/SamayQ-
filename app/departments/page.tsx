
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Navbar from "@/app/components/Navbar";
import DepartmentsClient, {
  type Department,
} from "./DepartmentsClient";

type SearchParams = Promise<{
  clinicId?: string | string[];
}>;

type NavbarRole =
  | "master_admin"
  | "clinic_admin"
  | "receptionist"
  | "doctor";

type DepartmentInput = {
  name: string;
  description: string;
  ticket_prefix: string;
};

/* --------------------------------
   PREFIX HELPERS
--------------------------------- */

function normalizeTokenPrefix(value: string): string | null {
  const prefix = (value ?? "").trim().toUpperCase();

  if (!prefix) return null;

  if (!/^[A-Z]{1,2}$/.test(prefix)) {
    throw new Error("Token prefix must contain one or two letters.");
  }

  return prefix;
}

/* --------------------------------
   AUTHORIZATION
--------------------------------- */

async function authorizeClinic(clinicId: string) {
  if (!clinicId) {
    throw new Error("Clinic ID is required.");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in to continue.");
  }

  const { data: platformAdmin, error: platformError } =
    await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

  if (platformError) {
    throw new Error(platformError.message);
  }

  if (!platformAdmin) {
    const { data: membership, error } = await supabase
      .from("clinic_memberships")
      .select("id, role")
      .eq("user_id", user.id)
      .eq("clinic_id", clinicId)
      .in("role", ["administrator", "receptionist"])
      .eq("is_active", true)
      .maybeSingle();

    if (error || !membership) {
      throw new Error(
        "You are not authorized to manage this clinic's departments."
      );
    }
  }

  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .select("id, is_active")
    .eq("id", clinicId)
    .maybeSingle();

  if (clinicError || !clinic || !clinic.is_active) {
    throw new Error("Clinic not found or inactive.");
  }

  return supabase;
}

/* --------------------------------
   CHECK PREFIX AVAILABILITY
--------------------------------- */

async function checkDepartmentPrefix(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clinicId: string,
  tokenPrefix: string | null,
  excludeDepartmentId?: string
) {
  if (!tokenPrefix) return;

  let departmentQuery = supabase
    .from("departments")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("token_prefix", tokenPrefix)
    .limit(1);

  if (excludeDepartmentId) {
    departmentQuery = departmentQuery.neq(
      "id",
      excludeDepartmentId
    );
  }

  const {
    data: existingDepartment,
    error: departmentError,
  } = await departmentQuery.maybeSingle();

  if (departmentError) {
    throw new Error(
      `Unable to verify department prefix: ${departmentError.message}`
    );
  }

  if (existingDepartment) {
    throw new Error(
      `The token prefix "${tokenPrefix}" is already assigned to another department.`
    );
  }

  let queueQuery = supabase
    .from("queues")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("token_prefix", tokenPrefix)
    .limit(1);

  if (excludeDepartmentId) {
    queueQuery = queueQuery.neq(
      "department_id",
      excludeDepartmentId
    );
  }

  const { data: existingQueue, error: queueError } =
    await queueQuery.maybeSingle();

  if (queueError) {
    throw new Error(
      `Unable to verify queue prefix: ${queueError.message}`
    );
  }

  if (existingQueue) {
    throw new Error(
      `The token prefix "${tokenPrefix}" is already being used by another queue in this clinic.`
    );
  }
}

/* --------------------------------
   CREATE OR SYNCHRONIZE DEPARTMENT QUEUE
--------------------------------- */

async function synchronizeDepartmentQueue(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clinicId: string,
  departmentId: string,
  options?: {
    name?: string;
    tokenPrefix?: string | null;
    isActive?: boolean;
  }
) {
  const { data: department, error: departmentError } =
    await supabase
      .from("departments")
      .select("id, name, token_prefix, is_active")
      .eq("id", departmentId)
      .eq("clinic_id", clinicId)
      .single();

  if (departmentError || !department) {
    throw new Error(
      departmentError?.message || "Department not found."
    );
  }

  const queueName = options?.name ?? department.name;

  const tokenPrefix =
    options?.tokenPrefix === undefined
      ? department.token_prefix
      : options.tokenPrefix;

  const isActive = options?.isActive ?? department.is_active;

  const queueAdmin = createAdminClient();

  const { data: existingQueues, error: queueFetchError } =
    await queueAdmin
      .from("queues")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("department_id", departmentId);

  if (queueFetchError) {
    throw new Error(
      `Unable to check department queue: ${queueFetchError.message}`
    );
  }

  if (existingQueues && existingQueues.length > 0) {
    const { error: updateError } = await queueAdmin
      .from("queues")
      .update({
        name: queueName,
        token_prefix: tokenPrefix,
        is_active: isActive,
      })
      .eq("clinic_id", clinicId)
      .eq("department_id", departmentId);

    if (updateError) {
      throw new Error(
        `Unable to synchronize department queue: ${updateError.message}`
      );
    }

    return;
  }

  const { error: insertError } = await queueAdmin
    .from("queues")
    .insert({
      clinic_id: clinicId,
      name: queueName,
      department_id: departmentId,
      line_mode: "own",
      token_prefix: tokenPrefix,
      next_token_number: 1,
      is_active: isActive,
    });

  if (insertError) {
    console.error("Queue insertion failed:", {
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
    });

    throw new Error(
      `Unable to create department queue: ${insertError.message}`
    );
  }
}

/* --------------------------------
   CREATE DEPARTMENT
--------------------------------- */

async function createDepartment(
  clinicId: string,
  values: DepartmentInput
) {
  "use server";

  const supabase = await authorizeClinic(clinicId);

  const name = values.name.trim();
  const description = values.description.trim();
  const tokenPrefix = normalizeTokenPrefix(
    values.ticket_prefix
  );

  if (!name) {
    throw new Error("Department name is required.");
  }

  await checkDepartmentPrefix(
    supabase,
    clinicId,
    tokenPrefix
  );

  const { data: department, error: departmentError } =
    await supabase
      .from("departments")
      .insert({
        clinic_id: clinicId,
        name,
        description: description || null,
        token_prefix: tokenPrefix,
        is_active: true,
      })
      .select("id")
      .single();

  if (departmentError || !department) {
    throw new Error(
      `Unable to create department: ${departmentError?.message}`
    );
  }

  try {
    await synchronizeDepartmentQueue(
      supabase,
      clinicId,
      department.id,
      {
        name,
        tokenPrefix,
        isActive: true,
      }
    );
  } catch (queueError) {
    const { error: rollbackError } = await supabase
      .from("departments")
      .delete()
      .eq("id", department.id)
      .eq("clinic_id", clinicId);

    if (rollbackError) {
      console.error(
        "Department cleanup after queue creation failure:",
        rollbackError.message
      );
    }

    throw queueError instanceof Error
      ? queueError
      : new Error("Department queue creation failed.");
  }

  revalidatePath("/departments");
  revalidatePath("/queues");
}

/* --------------------------------
   UPDATE DEPARTMENT
--------------------------------- */

async function updateDepartment(
  clinicId: string,
  departmentId: string,
  values: DepartmentInput
) {
  "use server";

  const supabase = await authorizeClinic(clinicId);

  const name = values.name.trim();
  const description = values.description.trim();
  const tokenPrefix = normalizeTokenPrefix(
    values.ticket_prefix
  );

  if (!departmentId) {
    throw new Error("Department ID is required.");
  }

  if (!name) {
    throw new Error("Department name is required.");
  }

  const { data: existingDepartment, error: fetchError } =
    await supabase
      .from("departments")
      .select("id, token_prefix")
      .eq("id", departmentId)
      .eq("clinic_id", clinicId)
      .maybeSingle();

  if (fetchError || !existingDepartment) {
    throw new Error(
      fetchError?.message || "Department not found."
    );
  }

  await checkDepartmentPrefix(
    supabase,
    clinicId,
    tokenPrefix,
    departmentId
  );

  const { data: updatedDepartment, error: updateError } =
    await supabase
      .from("departments")
      .update({
        name,
        description: description || null,
        token_prefix: tokenPrefix,
      })
      .eq("id", departmentId)
      .eq("clinic_id", clinicId)
      .select("id")
      .maybeSingle();

  if (updateError || !updatedDepartment) {
    throw new Error(
      updateError?.message || "Unable to update department."
    );
  }

  await synchronizeDepartmentQueue(
    supabase,
    clinicId,
    departmentId,
    {
      name,
      tokenPrefix,
    }
  );

  revalidatePath("/departments");
  revalidatePath("/queues");
}

/* --------------------------------
   DELETE DEPARTMENT
--------------------------------- */

async function deleteDepartment(
  clinicId: string,
  departmentId: string
) {
  "use server";

  const supabase = await authorizeClinic(clinicId);

  const { error } = await supabase
    .from("departments")
    .delete()
    .eq("id", departmentId)
    .eq("clinic_id", clinicId);

  if (error) {
    throw new Error(
      `Unable to delete department. It may be referenced by other records. ${error.message}`
    );
  }

  revalidatePath("/departments");
  revalidatePath("/queues");
}

/* --------------------------------
   REACTIVATE DEPARTMENT
--------------------------------- */

async function reactivateDepartment(
  clinicId: string,
  departmentId: string
) {
  "use server";

  const supabase = await authorizeClinic(clinicId);

  const { error: departmentError } = await supabase
    .from("departments")
    .update({ is_active: true })
    .eq("id", departmentId)
    .eq("clinic_id", clinicId);

  if (departmentError) {
    throw new Error(departmentError.message);
  }

  await synchronizeDepartmentQueue(
    supabase,
    clinicId,
    departmentId,
    {
      isActive: true,
    }
  );

  revalidatePath("/departments");
  revalidatePath("/queues");
}

/* --------------------------------
   MAIN PAGE CONTENT
--------------------------------- */

async function DepartmentsContent({
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

  const { data: platformAdmin, error: platformError } =
    await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

  if (platformError) {
    throw new Error(platformError.message);
  }

  const isMasterAdmin = Boolean(platformAdmin);

  // Fetch active administrator and receptionist memberships.
  const { data: memberships, error: membershipError } =
    await supabase
      .from("clinic_memberships")
      .select("clinic_id, role")
      .eq("user_id", user.id)
      .in("role", ["administrator", "receptionist"])
      .eq("is_active", true);

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const hasAdministratorRole =
    memberships?.some((m) => m.role === "administrator") ?? false;

  const hasReceptionistRole =
    memberships?.some((m) => m.role === "receptionist") ?? false;

  const role: NavbarRole = isMasterAdmin
    ? "master_admin"
    : hasAdministratorRole
      ? "clinic_admin"
      : hasReceptionistRole
        ? "receptionist"
        : "doctor";

  const params = await searchParams;

  let clinicId: string | null = null;

  if (isMasterAdmin) {
    clinicId =
      typeof params.clinicId === "string"
        ? params.clinicId
        : null;
  } else {
    if (!memberships || memberships.length !== 1) {
      return (
        <>
          <Navbar
            email={user.email ?? undefined}
            role={role}
          />

          <main className="p-8">
            <h1 className="text-xl font-semibold">
              Clinic access unavailable
            </h1>

            <p className="mt-2 text-slate-600">
              Your account must have exactly one active
              administrator or receptionist clinic membership.
            </p>
          </main>
        </>
      );
    }

    clinicId = memberships[0].clinic_id;
  }

  if (!clinicId) {
    return (
      <>
        <Navbar
          email={user.email ?? undefined}
          role={role}
        />

        <main className="p-8">
          <h1 className="text-xl font-semibold">
            Select a clinic first
          </h1>

          <p className="mt-2 text-slate-600">
            Select a clinic to manage its departments.
          </p>
        </main>
      </>
    );
  }

  // Verify clinic membership for non-platform admins.
  if (!isMasterAdmin) {
    const authorizedMembership = memberships?.find(
      (m) => m.clinic_id === clinicId
    );

    if (!authorizedMembership) {
      throw new Error(
        "You are not authorized to access this clinic."
      );
    }
  }

  const { data: clinic, error: clinicError } =
    await supabase
      .from("clinics")
      .select("id, name, is_active")
      .eq("id", clinicId)
      .maybeSingle();

  if (clinicError || !clinic || !clinic.is_active) {
    return (
      <>
        <Navbar
          email={user.email ?? undefined}
          role={role}
        />

        <main className="p-8">
          <h1 className="text-xl font-semibold">
            Clinic not found or inactive
          </h1>
        </main>
      </>
    );
  }

  const { data: settings, error: settingsError } =
    await supabase
      .from("clinic_settings")
      .select(
        "booking_mode, doctor_booking_enabled, department_booking_enabled"
      )
      .eq("clinic_id", clinicId)
      .maybeSingle();

  if (settingsError || !settings) {
    return (
      <>
        <Navbar
          email={user.email ?? undefined}
          role={role}
        />

        <main className="p-8">
          <h1 className="text-xl font-semibold">
            Department settings unavailable
          </h1>

          <p className="mt-2 text-slate-600">
            Configure this clinic's booking settings first.
          </p>
        </main>
      </>
    );
  }

  const bookingMode = settings.booking_mode;

  const isDepartmentBookingEnabled =
    bookingMode === "department" ||
    (bookingMode === "custom" &&
      settings.department_booking_enabled === true &&
      settings.doctor_booking_enabled === false);

  if (!isDepartmentBookingEnabled) {
    return (
      <>
        <Navbar
          email={user.email ?? undefined}
          role={role}
        />

        <main className="p-8">
          <h1 className="text-xl font-semibold">
            Departments are not enabled
          </h1>

          <p className="mt-2 text-slate-600">
            This clinic is not configured for department-wise
            booking. Change its booking mode in clinic settings.
          </p>
        </main>
      </>
    );
  }

  const { data: departmentRows, error: departmentsError } =
    await supabase
      .from("departments")
      .select(
        "id, name, description, is_active, created_at, token_prefix"
      )
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: true });

  if (departmentsError) {
    return (
      <>
        <Navbar
          email={user.email ?? undefined}
          role={role}
        />

        <main className="p-8">
          <h1 className="text-xl font-semibold">
            Unable to load departments
          </h1>

          <p className="mt-2 text-red-600">
            {departmentsError.message}
          </p>
        </main>
      </>
    );
  }

  const departments: Department[] = (
    departmentRows ?? []
  ).map((department) => ({
    id: department.id,
    name: department.name,
    description: department.description,
    is_active: department.is_active,
    created_at: department.created_at,
    ticket_prefix: department.token_prefix ?? "",
    token_letter: department.token_prefix ?? "",
  }));

  return (
    <>
      <Navbar
        email={user.email ?? undefined}
        role={role}
      />

      <DepartmentsClient
        clinicName={clinic.name}
        departments={departments}
        onAdd={async (values) => {
          "use server";

          await createDepartment(clinicId!, {
            name: values.name,
            description: values.description,
            ticket_prefix: values.ticket_prefix,
          });
        }}
        onEdit={async (id, values) => {
          "use server";

          await updateDepartment(clinicId!, id, {
            name: values.name,
            description: values.description,
            ticket_prefix: values.ticket_prefix,
          });
        }}
        onDelete={async (id) => {
          "use server";

          await deleteDepartment(clinicId!, id);
        }}
        onReactivate={async (id) => {
          "use server";

          await reactivateDepartment(clinicId!, id);
        }}
        onToggleOwnLine={async (_id, _enabled) => {
          "use server";

          throw new Error(
            "Own-line settings are not connected to the database yet."
          );
        }}
        onLineModeChange={async (_mode) => {
          "use server";

          throw new Error(
            "Department shared-line settings are not connected to the database yet."
          );
        }}
      />
    </>
  );
}

/* --------------------------------
   SUSPENSE WRAPPER
--------------------------------- */

export default function DepartmentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f3f5fc]">
          <p className="text-slate-600">
            Loading department settings...
          </p>
        </main>
      }
    >
      <DepartmentsContent searchParams={searchParams} />
    </Suspense>
  );
}
