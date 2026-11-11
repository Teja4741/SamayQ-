
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Doctor, WeekDay } from "./utils/types";

// --------------------------------------------------
// Types
// --------------------------------------------------

type ActionResult<T = undefined> = {
    success: boolean;
    message: string;
    data?: T;
};

type AddDoctorInput = {
    name: string;
    consultationDuration: number;
    patientsAtOnce: number;
    consultationPrice: number;
};

type UpdateDoctorInput = AddDoctorInput & {
    doctorId: string;
    assignmentId: string;
    tokenPrefix: string;
};

type DoctorScheduleRow = {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active: boolean;
};

type DoctorAssignmentRow = {
    id: string;
    doctor_id: string;
    clinic_id: string;
    consultation_duration_minutes: number;
    patients_at_once: number;
    consultation_price: number;
    token_prefix: string | null;
    is_on_screen: boolean;
    availability_status: "available" | "away";
    is_active: boolean;
    created_at: string;
    doctors: {
        id: string;
        full_name: string;
        profile_id: string | null;
        is_active: boolean;
    };
    doctor_schedules: DoctorScheduleRow[] | null;
};

// --------------------------------------------------
// Authorization
// --------------------------------------------------

async function getAuthorizedClinic(clinicId: string) {
    if (!clinicId) return null;

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        console.error("Authentication error:", authError);
        return null;
    }

    // Check Master Admin
    const { data: platformAdmin, error: platformError } =
        await supabase
            .from("platform_admins")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();

    if (platformError) {
        console.error("Platform admin check:", platformError);
        return null;
    }

    // Check Clinic Administrator if not Master Admin
    if (!platformAdmin) {
        const { data: membership, error: membershipError } =
            await supabase
                .from("clinic_memberships")
                .select("id")
                .eq("clinic_id", clinicId)
                .eq("user_id", user.id)
                .in("role", ["administrator", "receptionist"])
                .eq("is_active", true)
                .limit(1)
                .maybeSingle();

        if (membershipError || !membership) {
            console.error("Clinic membership check:", membershipError);
            return null;
        }
    }

    // Verify clinic
    const { data: clinic, error: clinicError } =
        await supabase
            .from("clinics")
            .select("id, is_active")
            .eq("id", clinicId)
            .maybeSingle();

    if (clinicError || !clinic || !clinic.is_active) {
        console.error("Clinic verification:", clinicError);
        return null;
    }

    // Booking mode is stored in clinic_settings.
    const { data: settings, error: settingsError } =
        await supabase
            .from("clinic_settings")
            .select(
                "booking_mode, doctor_booking_enabled, department_booking_enabled"
            )
            .eq("clinic_id", clinicId)
            .maybeSingle();

    if (settingsError || !settings) {
        console.error("Clinic settings check:", settingsError);
        return null;
    }

    const doctorBookingEnabled =
        settings.booking_mode === "doctor" ||
        (
            settings.booking_mode === "custom" &&
            settings.doctor_booking_enabled === true &&
            settings.department_booking_enabled === false
        );

    if (!doctorBookingEnabled) {
        return null;
    }

    return {
        clinicId: clinic.id,
    };
}

// --------------------------------------------------
// Validation
// --------------------------------------------------

function validateDoctorInput(input: AddDoctorInput): boolean {
    return (
        typeof input.name === "string" &&
        input.name.trim().length > 0 &&
        Number.isInteger(input.consultationDuration) &&
        input.consultationDuration > 0 &&
        Number.isInteger(input.patientsAtOnce) &&
        input.patientsAtOnce > 0 &&
        Number.isFinite(input.consultationPrice) &&
        input.consultationPrice >= 0
    );
}

function validateTokenPrefix(prefix: string): boolean {
    return (
        typeof prefix === "string" &&
        /^[A-Za-z0-9]{1,6}$/.test(prefix.trim())
    );
}

// --------------------------------------------------
// Map database records to Doctor objects
// --------------------------------------------------

function mapDoctorRows(rows: DoctorAssignmentRow[]): Doctor[] {
    const dayNames: WeekDay[] = [
        "Sun" as WeekDay,
        "Mon" as WeekDay,
        "Tue" as WeekDay,
        "Wed" as WeekDay,
        "Thu" as WeekDay,
        "Fri" as WeekDay,
        "Sat" as WeekDay,
    ];

    return rows.map((assignment) => {
        const schedules = (assignment.doctor_schedules ?? []).filter(
            (schedule) =>
                schedule.is_active &&
                schedule.day_of_week >= 0 &&
                schedule.day_of_week <= 6
        );

        const workingDays = [
            ...new Set(
                schedules.map(
                    (schedule) => dayNames[schedule.day_of_week]
                )
            ),
        ];

        const firstSchedule = schedules[0];

        return {
            id: assignment.doctors.id,
            assignmentId: assignment.id,
            name: assignment.doctors.full_name || "Unknown Doctor",

            consultationDuration:
                assignment.consultation_duration_minutes,

            patientsAtOnce: assignment.patients_at_once,

            consultationPrice: Number(assignment.consultation_price),

            tokenPrefix: assignment.token_prefix ?? "",

            workingDays,

            startTime: firstSchedule?.start_time?.slice(0, 5) ?? "",
            endTime: firstSchedule?.end_time?.slice(0, 5) ?? "",

            isOnScreen: assignment.is_on_screen,

            availability:
                assignment.availability_status === "available"
                    ? "Available"
                    : "Away",

            isActive:
                assignment.is_active && assignment.doctors.is_active,
        };
    });
}

// --------------------------------------------------
// Get Doctors
// --------------------------------------------------

export async function getDoctors(
    clinicId: string
): Promise<ActionResult<Doctor[]>> {
    try {
        const authorized = await getAuthorizedClinic(clinicId);

        if (!authorized) {
            return {
                success: false,
                message: "You are not authorized to access these doctors.",
            };
        }

        const supabase = await createClient();

        const { data, error } = await supabase
            .from("doctor_clinic_assignments")
            .select(`
        id,
        doctor_id,
        clinic_id,
        consultation_duration_minutes,
        patients_at_once,
        consultation_price,
        token_prefix,
        is_on_screen,
        availability_status,
        is_active,
        created_at,
        doctors!inner (
          id,
          full_name,
          profile_id,
          is_active
        ),
        doctor_schedules (
          day_of_week,
          start_time,
          end_time,
          is_active
        )
      `)
            .eq("clinic_id", authorized.clinicId)
            .is("department_id", null)
            .eq("is_active", true)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Fetch doctors error:", {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
            });

            return {
                success: false,
                message: `Database error: ${error.message}`,
            };
        }

        const rows = (data ?? []) as unknown as DoctorAssignmentRow[];

        return {
            success: true,
            message: "Doctors loaded successfully.",
            data: mapDoctorRows(rows),
        };
    } catch (error) {
        console.error("Get doctors exception:", error);

        return {
            success: false,
            message: "Something went wrong while loading doctors.",
        };
    }
}

// --------------------------------------------------
// Add Doctor
// --------------------------------------------------

export async function addDoctor(
    clinicId: string,
    input: AddDoctorInput
): Promise<ActionResult> {
    try {
        if (!input || !validateDoctorInput(input)) {
            return {
                success: false,
                message: "Please enter valid doctor details.",
            };
        }

        const authorized = await getAuthorizedClinic(clinicId);

        if (!authorized) {
            return {
                success: false,
                message: "You are not authorized to add doctors.",
            };
        }

        const supabase = await createClient();

        const { data, error } = await supabase.rpc(
            "add_clinic_doctor",
            {
                p_clinic_id: authorized.clinicId,
                p_full_name: input.name.trim(),
                p_consultation_duration: input.consultationDuration,
                p_patients_at_once: input.patientsAtOnce,
                p_consultation_price: input.consultationPrice,
            }
        );

        if (error) {
            console.error("Add doctor database error:", error);

            return {
                success: false,
                message: error.message || "Unable to add doctor.",
            };
        }

        if (!data?.success) {
            return {
                success: false,
                message: data?.message || "Unable to add doctor.",
            };
        }

        revalidatePath("/doctors");

        return {
            success: true,
            message: "Doctor added successfully.",
        };
    } catch (error) {
        console.error("Add doctor exception:", error);

        return {
            success: false,
            message: "Something went wrong while adding the doctor.",
        };
    }
}

// --------------------------------------------------
// Update Doctor
// --------------------------------------------------

export async function updateDoctor(
    clinicId: string,
    input: UpdateDoctorInput
): Promise<ActionResult> {
    try {
        if (
            !input ||
            !input.doctorId ||
            !input.assignmentId ||
            !validateDoctorInput(input) ||
            !validateTokenPrefix(input.tokenPrefix)
        ) {
            return {
                success: false,
                message: "Please enter valid doctor details and token prefix.",
            };
        }

        const authorized = await getAuthorizedClinic(clinicId);

        if (!authorized) {
            return {
                success: false,
                message: "You are not authorized to update doctors.",
            };
        }

        const supabase = await createClient();

        const { data: assignment, error: assignmentError } =
            await supabase
                .from("doctor_clinic_assignments")
                .select("id, doctor_id")
                .eq("id", input.assignmentId)
                .eq("clinic_id", authorized.clinicId)
                .eq("doctor_id", input.doctorId)
                .is("department_id", null)
                .eq("is_active", true)
                .maybeSingle();

        if (assignmentError || !assignment) {
            return {
                success: false,
                message: "Doctor assignment not found.",
            };
        }

        const tokenPrefix = input.tokenPrefix.trim().toUpperCase();

        // Update doctor name.
        const { error: doctorError } = await supabase
            .from("doctors")
            .update({
                full_name: input.name.trim(),
            })
            .eq("id", input.doctorId);

        if (doctorError) {
            console.error("Update doctor name error:", doctorError);

            return {
                success: false,
                message: doctorError.message,
            };
        }

        // Update this clinic's assignment settings and prefix.
        const { error: updateError } = await supabase
            .from("doctor_clinic_assignments")
            .update({
                consultation_duration_minutes: input.consultationDuration,
                patients_at_once: input.patientsAtOnce,
                consultation_price: input.consultationPrice,
                token_prefix: tokenPrefix,
            })
            .eq("id", input.assignmentId)
            .eq("clinic_id", authorized.clinicId)
            .eq("doctor_id", input.doctorId)
            .eq("is_active", true);

        if (updateError) {
            console.error("Update assignment error:", updateError);

            return {
                success: false,
                message: updateError.message,
            };
        }

        // Synchronize the existing queue prefix.
        // next_token_number is intentionally not changed.
        const { error: queueError } = await supabase
            .from("queues")
            .update({
                token_prefix: tokenPrefix,
            })
            .eq("clinic_id", authorized.clinicId)
            .eq("doctor_clinic_assignment_id", input.assignmentId);

        if (queueError) {
            console.error("Queue prefix update error:", queueError);

            return {
                success: false,
                message:
                    "Doctor settings were saved, but the queue prefix could not be synchronized: " +
                    queueError.message,
            };
        }

        revalidatePath("/doctors");
        revalidatePath("/queues");

        return {
            success: true,
            message: "Doctor and token prefix updated successfully.",
        };
    } catch (error) {
        console.error("Update doctor exception:", error);

        return {
            success: false,
            message: "Unable to update doctor.",
        };
    }
}

// --------------------------------------------------
// Update Doctor Availability
// --------------------------------------------------

export async function updateDoctorAvailability(
    clinicId: string,
    assignmentId: string,
    status: "available" | "away"
): Promise<ActionResult> {
    try {
        if (
            !assignmentId ||
            !["available", "away"].includes(status)
        ) {
            return {
                success: false,
                message: "Invalid availability details.",
            };
        }

        const authorized = await getAuthorizedClinic(clinicId);

        if (!authorized) {
            return {
                success: false,
                message: "You are not authorized to update availability.",
            };
        }

        const supabase = await createClient();

        const { data, error } = await supabase
            .from("doctor_clinic_assignments")
            .update({
                availability_status: status,
            })
            .eq("id", assignmentId)
            .eq("clinic_id", authorized.clinicId)
            .is("department_id", null)
            .eq("is_active", true)
            .select("id")
            .maybeSingle();

        if (error || !data) {
            console.error("Availability update error:", error);

            return {
                success: false,
                message: error?.message || "Doctor assignment not found.",
            };
        }

        revalidatePath("/doctors");

        return {
            success: true,
            message: "Doctor availability updated.",
        };
    } catch (error) {
        console.error("Availability exception:", error);

        return {
            success: false,
            message: "Unable to update doctor availability.",
        };
    }
}

// --------------------------------------------------
// Update Doctor Screen Status
// --------------------------------------------------

export async function updateDoctorScreenStatus(
    clinicId: string,
    assignmentId: string,
    isOnScreen: boolean
): Promise<ActionResult> {
    try {
        if (!assignmentId || typeof isOnScreen !== "boolean") {
            return {
                success: false,
                message: "Invalid display settings.",
            };
        }

        const authorized = await getAuthorizedClinic(clinicId);

        if (!authorized) {
            return {
                success: false,
                message: "You are not authorized to update display settings.",
            };
        }

        const supabase = await createClient();

        const { data, error } = await supabase
            .from("doctor_clinic_assignments")
            .update({
                is_on_screen: isOnScreen,
            })
            .eq("id", assignmentId)
            .eq("clinic_id", authorized.clinicId)
            .is("department_id", null)
            .eq("is_active", true)
            .select("id")
            .maybeSingle();

        if (error || !data) {
            console.error("Screen status update error:", error);

            return {
                success: false,
                message: error?.message || "Doctor assignment not found.",
            };
        }

        revalidatePath("/doctors");

        return {
            success: true,
            message: "Doctor screen status updated.",
        };
    } catch (error) {
        console.error("Screen status exception:", error);

        return {
            success: false,
            message: "Unable to update doctor screen status.",
        };
    }
}

// --------------------------------------------------
// Delete Doctor From Clinic
// --------------------------------------------------

export async function deleteDoctor(
    clinicId: string,
    assignmentId: string
): Promise<ActionResult> {
    try {
        if (!clinicId || !assignmentId) {
            return {
                success: false,
                message: "Clinic ID and doctor assignment ID are required.",
            };
        }

        const authorized = await getAuthorizedClinic(clinicId);

        if (!authorized) {
            return {
                success: false,
                message: "You are not authorized to remove this doctor.",
            };
        }

        const supabase = await createClient();

        // Soft-delete only the assignment for this clinic.
        // Historical appointments and queue records are preserved.
        const { data, error } = await supabase
            .from("doctor_clinic_assignments")
            .update({
                is_active: false,
            })
            .eq("id", assignmentId)
            .eq("clinic_id", authorized.clinicId)
            .is("department_id", null)
            .eq("is_active", true)
            .select("id")
            .maybeSingle();

        if (error) {
            console.error("Delete doctor database error:", error);

            return {
                success: false,
                message: error.message || "Unable to remove doctor.",
            };
        }

        if (!data) {
            return {
                success: false,
                message: "Doctor assignment not found or already removed.",
            };
        }

        revalidatePath("/doctors");

        return {
            success: true,
            message: "Doctor removed from this clinic successfully.",
        };
    } catch (error) {
        console.error("Delete doctor exception:", error);

        return {
            success: false,
            message: "Something went wrong while removing the doctor.",
        };
    }
}
