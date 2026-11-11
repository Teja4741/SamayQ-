
import type { Patient } from "../types/index";

// Normalize phone numbers for consistent patient matching.
export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

// Validate patient phone number.
export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);

  return normalized.length >= 10 && normalized.length <= 15;
}

// Find a returning patient using their phone number.
export function findReturningPatient(
  patients: Patient[],
  phone: string
): Patient | null {
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!normalizedPhone) {
    return null;
  }

  return (
    patients.find(
      (patient) =>
        normalizePhoneNumber(patient.phone) === normalizedPhone
    ) ?? null
  );
}

// Format patient name.
export function formatPatientName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

// Validate patient name.
export function isValidPatientName(name: string): boolean {
  return formatPatientName(name).length >= 2;
}