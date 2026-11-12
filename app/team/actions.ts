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
type InvitationResult = {
  success: boolean;
  message: string;
  invitationLink?: string;
};
type InvitationInput = {
  clinicId: string;
  fullName: string;
  email: string;
  phone?: string;
  role: StaffRole;
  screenPermissions: string[];
};
export async function sendTeamInvitation(
  input: InvitationInput
): Promise<InvitationResult> {
  let admin: ReturnType<typeof createAdminClient> | null = null;
  let invitationId: string | null = null;
  try {
    // 1. Validate input
    if (!input || typeof input !== "object") {
      return {
        success: false,
        message: "Invalid invitation details.",
      };
    }
    const {
      clinicId,
      fullName,
      email,
      phone,
      role,
      screenPermissions,
    } = input;
    if (
      typeof clinicId !== "string" ||
      typeof email !== "string" ||
      typeof role !== "string" ||
      !clinicId.trim() ||
      !email.trim() ||
      !role
    ) {
      return {
        success: false,
        message: "Clinic, email and role are required.",
      };
    }
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName =
      typeof fullName === "string" ? fullName.trim() : "";
    const normalizedPhone =
      typeof phone === "string" ? phone.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return {
        success: false,
        message: "Please enter a valid email address.",
      };
    }
    if (normalizedName.length > 100) {
      return {
        success: false,
        message: "Name must be 100 characters or fewer.",
      };
    }
    if (normalizedPhone.length > 20) {
      return {
        success: false,
        message: "Phone number must be 20 characters or fewer.",
      };
    }
    // Validate selected screen permissions.
    if (!Array.isArray(screenPermissions)) {
      return {
        success: false,
        message: "Invalid screen permissions.",
      };
    }
    const uniqueScreens = [...new Set(screenPermissions)];
    if (
      uniqueScreens.some(
        (screen) =>
          typeof screen !== "string" ||
          !allowedScreens.includes(screen as (typeof allowedScreens)[number])
      )
    ) {
      return {
        success: false,
        message: "One or more selected screens are invalid.",
      };
    }
    if (role === "receptionist" && uniqueScreens.length === 0) {
      return {
        success: false,
        message: "Select at least one screen permission for the receptionist.",
      };
    }
    // 2. Validate role
    const allowedRoles: StaffRole[] = [
      "administrator",
      "receptionist",
      "doctor",
    ];
    if (!allowedRoles.includes(role as StaffRole)) {
      return {
        success: false,
        message: "Invalid staff role.",
      };
    }
    // 3. Verify logged-in user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        message: "Your session has expired. Please log in again.",
      };
    }
    // 4. Verify inviter permissions
    const { data: platformAdmin, error: platformError } =
      await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
    if (platformError) {
      console.error("Platform admin check:", platformError);
      return {
        success: false,
        message: "Unable to verify your permissions.",
      };
    }
    if (!platformAdmin) {
      const { data: membership, error: membershipError } =
        await supabase
          .from("clinic_memberships")
          .select("id")
          .eq("clinic_id", clinicId)
          .eq("user_id", user.id)
          .eq("role", "administrator")
          .eq("is_active", true)
          .maybeSingle();
      if (membershipError) {
        console.error(
          "Membership validation error:",
          membershipError
        );
        return {
          success: false,
          message: "Unable to verify your clinic permissions.",
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
    // 5. Verify clinic
    admin = createAdminClient();

    const { data: clinic, error: clinicError } = await admin
      .from("clinics")
      .select("id, name, is_active")
      .eq("id", clinicId)
      .maybeSingle();

    if (clinicError) {
      console.error("Clinic validation error:", clinicError);
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

    // 6. Read the actual booking configuration
    const { data: clinicSettings, error: settingsError } = await admin
      .from("clinic_settings")
      .select(
        "booking_mode, doctor_booking_enabled, department_booking_enabled"
      )
      .eq("clinic_id", clinicId)
      .maybeSingle();

    if (settingsError) {
      console.error("Settings validation error:", settingsError);
      return {
        success: false,
        message: "Unable to verify clinic booking settings.",
      };
    }

    if (
      role === "doctor" &&
      clinicSettings?.doctor_booking_enabled !== true
    ) {
      return {
        success: false,
        message:
          "Doctor invitations require doctor-wise booking to be enabled.",
      };
    }
    // 7. Verify EmailJS configuration
    const emailjsServiceId = process.env.EMAILJS_SERVICE_ID;
    const emailjsTemplateId = process.env.EMAILJS_TEMPLATE_ID;
    const emailjsPublicKey = process.env.EMAILJS_PUBLIC_KEY;
    const emailjsPrivateKey = process.env.EMAILJS_PRIVATE_KEY;
    if (
      !emailjsServiceId ||
      !emailjsTemplateId ||
      !emailjsPublicKey ||
      !emailjsPrivateKey
    ) {
      console.error("EmailJS environment configuration is incomplete.");
      return {
        success: false,
        message: "Email service configuration is missing.",
      };
    }
    // 8. Check for an existing pending invitation
    const now = new Date().toISOString();
    const { data: existingInvitation, error: existingError } =
      await admin
        .from("team_invitations")
        .select("id")
        .eq("clinic_id", clinicId)
        .ilike("email", normalizedEmail)
        .eq("status", "pending")
        .gt("expires_at", now)
        .limit(1)
        .maybeSingle();
    if (existingError) {
      console.error("Existing invitation check:", existingError);
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
    // 9. Prepare invitation ID and URLs
    invitationId = crypto.randomUUID();
    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    ).replace(/\/+$/, "");
    const acceptUrl = new URL("/auth/accept-invitation", siteUrl);
    acceptUrl.searchParams.set("invitationId", invitationId);
    const confirmUrl = new URL("/auth/confirm", siteUrl);
    confirmUrl.searchParams.set(
      "next",
      acceptUrl.pathname + acceptUrl.search
    );
    // 10. Generate Supabase invitation link
    const {
      data: linkData,
      error: linkError,
    } = await admin.auth.admin.generateLink({
      type: "invite",
      email: normalizedEmail,
      options: {
        redirectTo: confirmUrl.toString(),
        data: {
          full_name: normalizedName,
        },
      },
    });
    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("Supabase invitation error:", linkError);
      invitationId = null;
      return {
        success: false,
        message:
          linkError?.message || "Unable to generate invitation link.",
      };
    }
    // 11. Get the hashed token
    const tokenHash = linkData.properties.hashed_token;
    // 12. Construct confirmation URL
    const invitationConfirmUrl = new URL(confirmUrl.toString());
    invitationConfirmUrl.searchParams.set("token_hash", tokenHash);
    invitationConfirmUrl.searchParams.set("type", "invite");
    // 13. Save invitation in database
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const { error: insertError } = await admin
      .from("team_invitations")
      .insert({
        id: invitationId,
        clinic_id: clinicId,
        email: normalizedEmail,
        full_name: normalizedName || null,
        phone: normalizedPhone || null,
        role,
        screen_permissions:
          role === "receptionist" ? uniqueScreens : [],
        invited_by: user.id,
        status: "pending",
        token_hash: tokenHash,
        expires_at: expiresAt,
      });
    if (insertError) {
      console.error("Invitation database error:", insertError);
      invitationId = null;
      return {
        success: false,
        message: "Could not save the invitation.",
      };
    }
    // 14. Prepare EmailJS template parameters
    const templateParams = {
      to_name: normalizedName || "there",
      to_email: normalizedEmail,
      clinic_name: clinic.name,
      staff_role: role,
      accept_url: invitationConfirmUrl.toString(),
    };
    // 15. Send email using EmailJS
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
            service_id: emailjsServiceId,
            template_id: emailjsTemplateId,
            user_id: emailjsPublicKey,
            accessToken: emailjsPrivateKey,
            template_params: templateParams,
          }),
          cache: "no-store",
        }
      );
    } catch (networkError) {
      console.error("EmailJS network error:", networkError);
      await admin
        .from("team_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationId);
      return {
        success: false,
        message: "Unable to connect to the email service.",
      };
    }
    const emailResponseText = await emailResponse.text();
    console.log("EMAILJS RESPONSE:", {
      status: emailResponse.status,
      response: emailResponseText,
      recipient: normalizedEmail,
    });
    // 16. Handle email failure
    if (!emailResponse.ok) {
      console.error("EmailJS sending failed:", emailResponseText);
      const { error: cancelError } = await admin
        .from("team_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationId);
      if (cancelError) {
        console.error("Invitation cancellation error:", cancelError);
      }
      return {
        success: false,
        message: `Email sending failed: ${emailResponseText}`,
      };
    }
    // 17. Invitation created successfully
    return {
      success: true,
      message: `Invitation sent successfully to ${normalizedEmail}.`,
      invitationLink: invitationConfirmUrl.toString(),
    };
  } catch (error) {
    console.error("Team invitation exception:", error);
    if (admin && invitationId) {
      await admin
        .from("team_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationId)
        .eq("status", "pending");
    }
    return {
      success: false,
      message: "Something went wrong while sending the invitation.",
    };
  }
}
