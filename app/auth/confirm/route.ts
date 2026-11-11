
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const requestedNext = searchParams.get("next") ?? "/";

  // Validate redirect destination
  const safeNext =
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//") &&
    !requestedNext.includes("\\")
      ? requestedNext
      : "/";

  if (!tokenHash || !type) {
    redirect("/auth/error?error=Missing%20confirmation%20details");
  }

  // Only allow supported OTP types
  const allowedTypes: EmailOtpType[] = [
    "signup",
    "invite",
    "magiclink",
    "recovery",
    "email_change",
    "email",
    "phone_change",
  ];

  if (!allowedTypes.includes(type)) {
    redirect("/auth/error?error=Invalid%20confirmation%20type");
  }

  const supabase = await createClient();

  // Handle staff invitations
  if (type === "invite") {
    const nextUrl = new URL(safeNext, origin);

    if (nextUrl.pathname !== "/auth/accept-invitation") {
      redirect("/auth/error?error=Invalid%20invitation%20redirect");
    }

    const invitationId = nextUrl.searchParams.get("invitationId");

    if (!invitationId) {
      redirect("/auth/error?error=Missing%20invitation%20ID");
    }

    const admin = createAdminClient();

    // Check invitation record before consuming token
    const { data: invitation, error: invitationError } = await admin
      .from("team_invitations")
      .select("id, email")
      .eq("id", invitationId)
      .eq("token_hash", tokenHash)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (invitationError || !invitation) {
      console.error(
        "Invitation token verification failed:",
        invitationError
      );

      redirect("/auth/error?error=Invalid%20or%20expired%20invitation");
    }

    // Verify Supabase invitation token
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: "invite",
      token_hash: tokenHash,
    });

    if (verifyError) {
      console.error(
        "Invitation OTP verification failed:",
        verifyError
      );

      redirect("/auth/error?error=Invitation%20verification%20failed");
    }

    // Verify authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (
      userError ||
      !user?.email ||
      user.email.trim().toLowerCase() !==
        invitation.email.trim().toLowerCase()
    ) {
      redirect("/auth/error?error=Invitation%20email%20mismatch");
    }

    // Continue to invitation acceptance page
    redirect(nextUrl.toString());
  }

  // Handle other confirmation types
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    console.error("OTP confirmation failed:", error);

    redirect("/auth/error?error=Confirmation%20failed");
  }

  redirect(new URL(safeNext, origin).toString());
}
