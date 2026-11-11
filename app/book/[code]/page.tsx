
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import PublicBookingClient from "./PublicBookingClient";

export const instant = false;

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function PublicBookingPage({
  params,
}: PageProps) {
  const { code } = await params;

  if (!code?.trim()) {
    notFound();
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_public_booking_info",
    {
      p_code: code,
    }
  );

  if (error) {
    console.error("Public booking fetch error:", error);
    throw new Error("Unable to load booking information.");
  }

  if (!data) {
    notFound();
  }

  // Handle either an object or an array containing one object.
  const bookingInfo = Array.isArray(data) ? data[0] : data;

  if (!bookingInfo) {
    notFound();
  }

  const clinic = bookingInfo.clinic;
  const bookingMode = bookingInfo.booking_mode;

  if (
    !clinic ||
    !["doctor", "department"].includes(bookingMode)
  ) {
    notFound();
  }

  return (
    <PublicBookingClient
      code={code}
      clinic={clinic}
      bookingMode={bookingMode}
      departments={bookingInfo.departments ?? []}
      doctors={bookingInfo.doctors ?? []}
    />
  );
}
