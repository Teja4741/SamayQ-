
"use server";

import { createClient } from "@/lib/supabase/server";

export type AccountActionResult = {
  success: boolean;
  message: string;
};

export async function saveProfile(
  fullName: string,
  phone: string
): Promise<AccountActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  const cleanName = fullName.trim();
  const cleanPhone = phone.trim();

  if (!cleanName) {
    return { success: false, message: "Please enter your full name." };
  }

  if (cleanName.length > 100) {
    return { success: false, message: "Your name is too long." };
  }

  if (cleanPhone.length > 30) {
    return { success: false, message: "Please enter a valid phone number." };
  }

  const { data: existingProfile, error: readError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    return { success: false, message: "Unable to check your profile." };
  }

  if (!existingProfile) {
    return {
      success: false,
      message: "Your profile record was not found. Please contact support.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: cleanName,
      phone: cleanPhone || null,
    })
    .eq("id", user.id);

  if (error) {
    return {
      success: false,
      message: "Could not save your changes. Check your profile permissions.",
    };
  }

  return { success: true, message: "Profile updated successfully." };
}

export async function resendEmailVerification(): Promise<AccountActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    return { success: false, message: "Please sign in again to continue." };
  }

  if (user.email_confirmed_at) {
    return { success: true, message: "Your email is already verified." };
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: user.email,
  });

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  return {
    success: true,
    message: "Verification email requested. Check your inbox and spam folder.",
  };
}

export async function verifyEmailCode(
  token: string
): Promise<AccountActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    return { success: false, message: "Please sign in again to continue." };
  }

  const cleanToken = token.trim();

  if (!/^\d{6,8}$/.test(cleanToken)) {
    return {
      success: false,
      message: "Enter the verification code from your email.",
    };
  }

  const { error } = await supabase.auth.verifyOtp({
    email: user.email,
    token: cleanToken,
    type: "signup",
  });

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  return {
    success: true,
    message: "Email verified successfully.",
  };
}
