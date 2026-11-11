
"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function acceptTeamInvitation(invitationId: string) {
  try {
    // 1. Validate invitation ID
    if (!invitationId || !/^[0-9a-f-]{36}$/i.test(invitationId)) {
      return {
        success: false,
        message: "Invalid invitation link.",
      };
    }

    // 2. Verify the authenticated Supabase user
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return {
        success: false,
        message: "Your session has expired. Please open the invitation email again.",
      };
    }

    const admin = createAdminClient();
    const normalizedEmail = user.email.trim().toLowerCase();

    // 3. Find the matching pending invitation
    const { data: invitation, error: invitationError } = await admin
      .from("team_invitations")
      .select("id, clinic_id, email, full_name, phone, role, status, expires_at")
      .eq("id", invitationId)
      .ilike("email", normalizedEmail)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (invitationError) {
      console.error("Invitation lookup error:", invitationError);

      return {
        success: false,
        message: "Unable to verify your invitation.",
      };
    }

    if (!invitation) {
      return {
        success: false,
        message: "This invitation is invalid, expired, or already used.",
      };
    }

    // 4. Ensure the invited Supabase user has a profile.
    // clinic_memberships.user_id references profiles.id.
    const { error: profileError } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          full_name: invitation.full_name || user.email,
          phone: invitation.phone || null,
        },
        {
          onConflict: "id",
          ignoreDuplicates: true,
        }
      );

    if (profileError) {
      console.error("Profile creation error:", profileError);

      return {
        success: false,
        message: "Could not prepare your staff profile.",
      };
    }

    // 5. Atomically activate membership and accept invitation.
    const { data: result, error: acceptanceError } = await admin.rpc(
      "accept_team_invitation",
      {
        p_invitation_id: invitation.id,
        p_user_id: user.id,
        p_user_email: normalizedEmail,
      }
    );

    if (acceptanceError) {
      console.error("Invitation acceptance error:", acceptanceError);

      return {
        success: false,
        message: acceptanceError.message || "Could not accept your invitation.",
      };
    }

    if (!result?.success) {
      return {
        success: false,
        message: result?.message || "Invitation acceptance failed.",
      };
    }

    return {
      success: true,
      message: "Your invitation has been accepted successfully.",
    };
  } catch (error) {
    console.error("Accept invitation exception:", error);

    return {
      success: false,
      message: "Something went wrong while accepting your invitation.",
    };
  }
}
