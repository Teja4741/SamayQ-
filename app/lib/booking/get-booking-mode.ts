
export type BookingMode = "doctor" | "department";

export function resolveBookingMode(settings: {
  booking_mode: string;
  doctor_booking_enabled: boolean;
  department_booking_enabled: boolean;
}): BookingMode {
  if (settings.booking_mode === "doctor") return "doctor";

  if (settings.booking_mode === "department") return "department";

  if (settings.booking_mode === "custom") {
    if (
      settings.doctor_booking_enabled &&
      !settings.department_booking_enabled
    ) {
      return "doctor";
    }

    if (
      settings.department_booking_enabled &&
      !settings.doctor_booking_enabled
    ) {
      return "department";
    }
  }

  throw new Error("Invalid clinic booking configuration.");
}
