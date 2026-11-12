
"use server";

import "server-only";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type StaffRole = "administrator" | "receptionist" | "doctor";

const allowedScreens = [
  "waitlist",
  "reservations",
  "customers",
  "insights",
  "history",
  "settings",
  "departments",
  "team",
  "billing",
] as const;

type InvitationInput = {
  clinicId: string;
  fullName?: string;
  email: string;
  phone?: string;
  role: StaffRole;
  screenPermissions: string[];
  departmentIds: string[];
  restrictDoctors: boolean;
  doctorIds: string[];
};

type InvitationResult = {
  success: boolean;
  message: string;
  invitationLink?: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function sendTeamInvitation(
  input: InvitationInput
): Promise<InvitationResult> {
  try {
    // 1. Validate input.

    const clinicId = input.clinicId?.trim();
    const role = input.role;

    // Doctor identity comes from the selected existing doctor record.
    // Do not use the staff name or phone as doctor identity.
    const fullName =
      role === "doctor" ? null : input.fullName?.trim() || null;

    const phone =
      role === "doctor" ? null : input.phone?.trim() || null;

    const email = input.email?.trim().toLowerCase();

    if (!clinicId || !isUuid(clinicId)) {
      return { success: false, message: "Invalid clinic." };
    }

    if (fullName && fullName.length > 100) {
      return { success: false, message: "Full name is too long." };
    }

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return {
        success: false,
        message: "Enter a valid email address.",
      };
    }

    if (phone && phone.length > 25) {
      return { success: false, message: "Phone number is too long." };
    }

    if (!["administrator", "receptionist", "doctor"].includes(role)) {
      return { success: false, message: "Invalid staff role." };
    }

    const uniqueScreens = [
      ...new Set(input.screenPermissions ?? []),
    ];

    const departmentIds = [
      ...new Set(input.departmentIds ?? []),
    ];

    const doctorIds = [
      ...new Set(input.doctorIds ?? []),
    ];

    // Doctor invitations must always be restricted to exactly one doctor.
    const restrictDoctors =
      role === "doctor" ? true : input.restrictDoctors === true;

    if (
      uniqueScreens.length === 0 ||
      uniqueScreens.some(
        (screen) =>
          !allowedScreens.includes(
            screen as (typeof allowedScreens)[number]
          )
      )
    ) {
      return {
        success: false,
        message: "Select at least one valid screen permission.",
      };
    }

    if (
      departmentIds.some((id) => !isUuid(id)) ||
      doctorIds.some((id) => !isUuid(id))
    ) {
      return {
        success: false,
        message: "Invalid department or doctor selection.",
      };
    }

    if (role === "doctor") {
      if (doctorIds.length !== 1) {
        return {
          success: false,
          message: "Select exactly one doctor for a doctor login.",
        };
      }
    } else {
      if (restrictDoctors && doctorIds.length === 0) {
        return {
          success: false,
          message:
            "Select at least one doctor when doctor restriction is enabled.",
        };
      }

      if (!restrictDoctors && doctorIds.length > 0) {
        return {
          success: false,
          message:
            "Disable doctor restriction or clear the selected doctors.",
        };
      }
    }

    // 2. Verify logged-in user.

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError);

      return {
        success: false,
        message: "Please sign in again.",
      };
    }

    // 3. Create service role client.

    const admin = createAdminClient();

    // 4. Check platform administrator.

    const {
      data: platformAdmin,
      error: platformError,
    } = await admin
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (platformError) {
      console.error("Platform admin verification error:", platformError);

      return {
        success: false,
        message:
          "Unable to verify platform administrator permissions.",
      };
    }

    const isPlatformAdmin = !!platformAdmin;

    // 5. Check clinic administrator if not platform administrator.

    if (!isPlatformAdmin) {
      const {
        data: membership,
        error: membershipError,
      } = await admin
        .from("clinic_memberships")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("user_id", user.id)
        .eq("role", "administrator")
        .eq("is_active", true)
        .maybeSingle();

      if (membershipError) {
        console.error(
          "Membership verification error:",
          membershipError
        );

        return {
          success: false,
          message:
            "Unable to verify clinic administrator permissions.",
        };
      }

      if (!membership) {
        return {
          success: false,
          message:
            "You are not authorized to invite staff to this clinic.",
        };
      }
    }

    // 6. Verify clinic.

    const {
      data: clinic,
      error: clinicError,
    } = await admin
      .from("clinics")
      .select("id, name, is_active")
      .eq("id", clinicId)
      .maybeSingle();

    if (clinicError) {
      console.error("Clinic lookup error:", clinicError);

      return {
        success: false,
        message: "Unable to verify the clinic.",
      };
    }

    if (!clinic || !clinic.is_active) {
      return {
        success: false,
        message: "Clinic not found or inactive.",
      };
    }

    // 7. Verify clinic booking settings.

    const {
      data: clinicSettings,
      error: settingsError,
    } = await admin
      .from("clinic_settings")
      .select(
        "booking_mode, doctor_booking_enabled, department_booking_enabled"
      )
      .eq("clinic_id", clinicId)
      .maybeSingle();

    if (settingsError || !clinicSettings) {
      console.error(
        "Clinic settings lookup error:",
        settingsError
      );

      return {
        success: false,
        message: "Clinic booking settings could not be loaded.",
      };
    }

    if (
      role === "doctor" &&
      clinicSettings.doctor_booking_enabled !== true
    ) {
      return {
        success: false,
        message: "Doctor invitations are disabled for this clinic.",
      };
    }

    // 8. Verify selected departments.

    if (departmentIds.length > 0) {
      const {
        data: departments,
        error: departmentError,
      } = await admin
        .from("departments")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("is_active", true)
        .in("id", departmentIds);

      if (
        departmentError ||
        !departments ||
        departments.length !== departmentIds.length
      ) {
        console.error(
          "Department validation error:",
          departmentError
        );

        return {
          success: false,
          message:
            "One or more selected departments are invalid or inactive.",
        };
      }
    }

    // 9. Verify selected doctors and their active assignments.

    if (doctorIds.length > 0) {
      let doctorQuery = admin
        .from("doctor_clinic_assignments")
        .select("doctor_id, department_id")
        .eq("clinic_id", clinicId)
        .eq("is_active", true)
        .in("doctor_id", doctorIds);

      if (departmentIds.length > 0) {
        doctorQuery = doctorQuery.in(
          "department_id",
          departmentIds
        );
      }

      const {
        data: assignments,
        error: assignmentError,
      } = await doctorQuery;

      if (assignmentError) {
        console.error(
          "Doctor assignment lookup error:",
          assignmentError
        );

        return {
          success: false,
          message: "Unable to verify selected doctor assignments.",
        };
      }

      const assignedDoctorIds = [
        ...new Set(
          (assignments ?? []).map((row) => row.doctor_id)
        ),
      ];

      if (assignedDoctorIds.length !== doctorIds.length) {
        return {
          success: false,
          message:
            "One or more selected doctors are not actively assigned to the selected clinic/departments.",
        };
      }

      // Verify the selected doctor record is active.
      const {
        data: activeDoctors,
        error: activeDoctorError,
      } = await admin
        .from("doctors")
        .select("id")
        .eq("is_active", true)
        .in("id", doctorIds);

      if (
        activeDoctorError ||
        !activeDoctors ||
        activeDoctors.length !== doctorIds.length
      ) {
        console.error(
          "Doctor record validation error:",
          activeDoctorError
        );

        return {
          success: false,
          message:
            "One or more selected doctor records are unavailable.",
        };
      }
    }

    // 10. Check existing pending invitation.

    const {
      data: existingInvitation,
      error: existingError,
    } = await admin
      .from("team_invitations")
      .select("id")
      .eq("clinic_id", clinicId)
      .ilike("email", email)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existingError) {
      console.error(
        "Existing invitation lookup error:",
        existingError
      );

      return {
        success: false,
        message: "Unable to check existing invitations.",
      };
    }

    if (existingInvitation) {
      return {
        success: false,
        message:
          "A pending invitation already exists for this email.",
      };
    }

    // 11. Verify EmailJS configuration.

    const serviceId = process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.EMAILJS_PUBLIC_KEY;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY;

    if (!serviceId || !templateId || !publicKey || !privateKey) {
      console.error("EmailJS environment variables are missing.");

      return {
        success: false,
        message: "Invitation email service is not configured.",
      };
    }

    // 12. Generate invitation link.

    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    ).replace(/\/+$/, "");

    const invitationId = randomUUID();

    const acceptPath =
      `/auth/accept-invitation?invitationId=${invitationId}`;

    const redirectTo =
      `${siteUrl}/auth/confirm?next=${encodeURIComponent(acceptPath)}`;

    const {
      data: generated,
      error: generateError,
    } = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo,
        data: {
          ...(fullName ? { full_name: fullName } : {}),
        },
      },
    });

    if (generateError || !generated?.properties?.hashed_token) {
      console.error("Invite link generation error:", generateError);

      return {
        success: false,
        message: "Could not generate the invitation link.",
      };
    }

    const hashedToken = generated.properties.hashed_token;

    const invitationLink =
      `${siteUrl}/auth/confirm` +
      `?next=${encodeURIComponent(acceptPath)}` +
      `&token_hash=${encodeURIComponent(hashedToken)}` +
      `&type=invite`;

    // 13. Save invitation and permissions.

    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { error: insertError } = await admin
      .from("team_invitations")
      .insert({
        id: invitationId,
        clinic_id: clinicId,
        email,
        full_name: fullName,
        phone,
        role,
        invited_by: user.id,
        status: "pending",
        token_hash: hashedToken,
        expires_at: expiresAt,
        screen_permissions: uniqueScreens,
        department_ids: departmentIds,
        restrict_doctors: restrictDoctors,
        doctor_ids: restrictDoctors ? doctorIds : [],
      });

    if (insertError) {
      console.error("Invitation insert error:", insertError);

      return {
        success: false,
        message: "Could not save the invitation.",
      };
    }

    // 14. Send invitation email through EmailJS.

    let emailResponse: Response;

    try {
      emailResponse = await fetch(
        "https://api.emailjs.com/api/v1.0/email/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            service_id: serviceId,
            template_id: templateId,
            user_id: publicKey,
            accessToken: privateKey,
            template_params: {
              to_name: fullName || "Staff Member",
              to_email: email,
              clinic_name: clinic.name,
              staff_role: role,
              accept_url: invitationLink,
            },
          }),
        }
      );
    } catch (emailNetworkError) {
      console.error(
        "EmailJS network error:",
        emailNetworkError
      );

      await admin
        .from("team_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationId);

      return {
        success: false,
        message:
          "Invitation was created but the email could not be sent. Please try again.",
      };
    }

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text();

      console.error("EmailJS error:", emailError);

      await admin
        .from("team_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationId);

      return {
        success: false,
        message:
          "Invitation was created but the email could not be sent. Please try again.",
      };
    }

    // 15. Success.

    console.log("Team invitation sent successfully:", {
      invitationId,
      clinicId,
      role,
      email,
    });

    return {
      success: true,
      message: "Invitation sent successfully.",
      invitationLink,
    };
  } catch (error) {
    console.error("sendTeamInvitation error:", error);

    return {
      success: false,
      message:
        "Something went wrong while sending the invitation.",
    };
  }
}
