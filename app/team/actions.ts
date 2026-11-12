
"use server";

import "server-only";

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
  fullName: string;
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
    const clinicId = input.clinicId?.trim();
    const fullName = input.fullName?.trim();
    const email = input.email?.trim().toLowerCase();
    const phone = input.phone?.trim() || null;
    const role = input.role;

    if (!clinicId || !isUuid(clinicId)) {
      return { success: false, message: "Invalid clinic." };
    }

    if (!fullName || fullName.length > 100) {
      return { success: false, message: "Enter a valid full name." };
    }

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return { success: false, message: "Enter a valid email address." };
    }

    if (phone && phone.length > 25) {
      return { success: false, message: "Phone number is too long." };
    }

    if (!["administrator", "receptionist", "doctor"].includes(role)) {
      return { success: false, message: "Invalid staff role." };
    }

    const uniqueScreens = [...new Set(input.screenPermissions ?? [])];
    const departmentIds = [...new Set(input.departmentIds ?? [])];
    const doctorIds = [...new Set(input.doctorIds ?? [])];
    const restrictDoctors = input.restrictDoctors === true;

    if (
      uniqueScreens.some(
        (screen) => !allowedScreens.includes(screen as (typeof allowedScreens)[number])
      )
    ) {
      return { success: false, message: "Invalid screen permission." };
    }

    if (role === "receptionist" && uniqueScreens.length === 0) {
      return {
        success: false,
        message: "Select at least one screen for the receptionist.",
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

    if (restrictDoctors && doctorIds.length === 0) {
      return {
        success: false,
        message: "Select at least one doctor when doctor restriction is enabled.",
      };
    }

    if (!restrictDoctors && doctorIds.length > 0) {
      return {
        success: false,
        message: "Disable doctor restriction or clear the selected doctors.",
      };
    }

    // Verify the logged-in inviter.
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: "Please sign in again.",
      };
    }

    const admin = createAdminClient();

    // Verify platform administrator or clinic administrator.
    const { data: platformAdmin, error: platformError } = await admin
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (platformError) {
      console.error("Platform admin lookup:", platformError);
      return {
        success: false,
        message: "Unable to verify your permissions.",
      };
    }

    if (!platformAdmin) {
      const { data: membership, error: membershipError } = await admin
        .from("clinic_memberships")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("user_id", user.id)
        .eq("role", "administrator")
        .eq("is_active", true)
        .maybeSingle();

      if (membershipError || !membership) {
        return {
          success: false,
          message: "You are not authorized to invite staff to this clinic.",
        };
      }
    }

    // Verify the clinic.
    const { data: clinic, error: clinicError } = await admin
      .from("clinics")
      .select("id, name, is_active")
      .eq("id", clinicId)
      .maybeSingle();

    if (clinicError) {
      console.error("Clinic lookup:", clinicError);
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

    // Read the actual booking configuration.
    const { data: clinicSettings, error: settingsError } = await admin
      .from("clinic_settings")
      .select(
        "booking_mode, doctor_booking_enabled, department_booking_enabled"
      )
      .eq("clinic_id", clinicId)
      .maybeSingle();

    if (settingsError || !clinicSettings) {
      console.error("Clinic settings lookup:", settingsError);
      return {
        success: false,
        message: "Clinic booking settings could not be loaded.",
      };
    }

    if (role === "doctor" && clinicSettings.doctor_booking_enabled !== true) {
      return {
        success: false,
        message: "Doctor invitations are disabled for this clinic.",
      };
    }

    // Verify every selected department belongs to this clinic.
    if (departmentIds.length > 0) {
      const { data: departments, error: departmentError } = await admin
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
        return {
          success: false,
          message:
            "One or more selected departments are invalid or inactive.",
        };
      }
    }

    // Verify selected doctors have active assignments in this clinic.
    if (doctorIds.length > 0) {
      let doctorQuery = admin
        .from("doctor_clinic_assignments")
        .select("doctor_id, department_id")
        .eq("clinic_id", clinicId)
        .eq("is_active", true)
        .in("doctor_id", doctorIds);

      if (departmentIds.length > 0) {
        doctorQuery = doctorQuery.in("department_id", departmentIds);
      }

      const { data: assignments, error: assignmentError } =
        await doctorQuery;

      const assignedDoctorIds = [
        ...new Set((assignments ?? []).map((row) => row.doctor_id)),
      ];

      if (
        assignmentError ||
        assignedDoctorIds.length !== doctorIds.length
      ) {
        return {
          success: false,
          message:
            "One or more selected doctors are not actively assigned to the selected clinic/departments.",
        };
      }
    }

    // Prevent duplicate pending invitations.
    const { data: existingInvitation, error: existingError } = await admin
      .from("team_invitations")
      .select("id")
      .eq("clinic_id", clinicId)
      .ilike("email", email)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existingError) {
      console.error("Existing invitation lookup:", existingError);
      return {
        success: false,
        message: "Unable to check existing invitations.",
      };
    }

    if (existingInvitation) {
      return {
        success: false,
        message: "A pending invitation already exists for this email.",
      };
    }

    // EmailJS configuration.
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

    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    ).replace(/\/$/, "");

    const invitationId = crypto.randomUUID();

    const acceptPath = `/auth/accept-invitation?invitationId=${invitationId}`;
    const redirectTo = `${siteUrl}/auth/confirm?next=${encodeURIComponent(
      acceptPath
    )}`;

    // Generate Supabase invite token.
    const { data: generated, error: generateError } =
      await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          redirectTo,
          data: {
            full_name: fullName,
          },
        },
      });

    if (generateError || !generated?.properties?.hashed_token) {
      console.error("Invite link generation:", generateError);
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

    // Save invitation and its restrictions.
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
        screen_permissions:
          role === "receptionist" ? uniqueScreens : [],
        department_ids: departmentIds,
        restrict_doctors: restrictDoctors,
        doctor_ids: restrictDoctors ? doctorIds : [],
      });

    if (insertError) {
      console.error("Invitation insert:", insertError);
      return {
        success: false,
        message: "Could not save the invitation.",
      };
    }

    // Send invitation email through EmailJS.
    const emailResponse = await fetch(
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
            to_name: fullName,
            to_email: email,
            clinic_name: clinic.name,
            staff_role: role,
            accept_url: invitationLink,
          },
        }),
      }
    );

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

    return {
      success: true,
      message: "Invitation sent successfully.",
      invitationLink,
    };
  } catch (error) {
    console.error("sendTeamInvitation error:", error);

    return {
      success: false,
      message: "Something went wrong while sending the invitation.",
    };
  }
}
