
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";


type Clinic = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  business_type: string | null;
  booking_mode: string | null;
  doctor_booking_enabled: boolean;
  department_booking_enabled: boolean;
  is_active: boolean | null;
  created_at: string;
};


type ActionResult = {
  success: boolean;
  error?: string;
};

type ClinicsClientProps = {
  clinics: Clinic[];
  clinicsError: string;
  modal: "business" | null;
  created: string;
  error: string;
  createBusiness: (formData: FormData) => Promise<ActionResult>;
  toggleClinicStatus: (
    clinicId: string,
    isActive: boolean
  ) => Promise<ActionResult>;
};

const inputClass =
  "h-[55px] w-full rounded-xl border border-slate-200 bg-transparent px-4 text-[16px] text-slate-800 outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-violet-950";

const labelClass =
  "mb-2 block text-[16px] font-medium text-slate-500";

export default function ClinicsClient({
  clinics,
  clinicsError,
  modal,
  created,
  error,
  createBusiness,
  toggleClinicStatus,
}: ClinicsClientProps) {
  const router = useRouter();

  const [activeModal, setActiveModal] = useState<"business" | null>(
    modal
  );
  const [submitting, setSubmitting] = useState(false);
  const [togglingClinicId, setTogglingClinicId] =
    useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  useEffect(() => {
    setActiveModal(modal);
  }, [modal]);

  function clearActionMessages() {
    setActionError("");
    setActionSuccess("");
  }

  async function handleCreateBusiness(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const form = event.currentTarget;

    setSubmitting(true);
    clearActionMessages();

    try {
      const formData = new FormData(form);
      const result = await createBusiness(formData);

      if (!result.success) {
        setActionError(
          result.error || "Unable to create business."
        );
        return;
      }

      setActionSuccess("Business created successfully.");

      form.reset();
      router.refresh();
    } catch {
      setActionError(
        "Something went wrong while creating the business."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleClinicStatus(clinic: Clinic) {
    const nextStatus = clinic.is_active !== true;

    const confirmed = window.confirm(
      nextStatus
        ? `Activate ${clinic.name}?\n\nThe hospital record and its existing data will be preserved.`
        : `Deactivate ${clinic.name}?\n\nThe hospital record and its existing data will not be deleted.`
    );

    if (!confirmed) return;

    setTogglingClinicId(clinic.id);
    clearActionMessages();

    try {
      const result = await toggleClinicStatus(
        clinic.id,
        nextStatus
      );

      if (!result.success) {
        setActionError(
          result.error || "Unable to change clinic status."
        );
        return;
      }

      setActionSuccess(
        `${clinic.name} is now ${nextStatus ? "Active" : "Inactive"
        }. No clinic data was deleted.`
      );

      router.refresh();
    } catch {
      setActionError(
        "Something went wrong while changing the clinic status."
      );
    } finally {
      setTogglingClinicId(null);
    }
  }

  function openModal() {
    clearActionMessages();
    setActiveModal("business");
    router.replace("/clinics?modal=business", {
      scroll: false,
    });
  }

  function closeModal() {
    clearActionMessages();
    setActiveModal(null);
    router.replace("/clinics", { scroll: false });
  }

  return (
    <main className="min-h-screen bg-[#f5f6fc] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-6xl px-5 py-8">
        {/* Page heading */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Business management
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Manage businesses and their addresses across your
              SamayQ platform.
            </p>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            + Add Business
          </button>
        </div>

        {/* Success message from URL */}
        {created && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            Business created successfully.
          </div>
        )}

        {/* Error message from URL */}
        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Status update feedback */}
        {actionError && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {actionError}
          </div>
        )}

        {actionSuccess && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {actionSuccess}
          </div>
        )}

        {/* Existing businesses */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
            <div>
              <h2 className="font-semibold">
                Existing businesses
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Businesses registered on your platform.
              </p>
            </div>

            <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              {clinics.length} businesses
            </span>
          </div>

          {clinicsError ? (
            <p className="p-6 text-sm text-red-600">
              {clinicsError}
            </p>
          ) : clinics.length === 0 ? (
            <div className="p-10 text-center">
              <h3 className="font-medium">
                No businesses yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Select Add Business to create your first business.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {clinics.map((clinic) => (
                <article
                  key={clinic.id}
                  className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="font-semibold">
                      {clinic.name}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {clinic.business_type || "Healthcare"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Address: {clinic.address || "No address added"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {clinic.booking_mode === "doctor"
                        ? "Doctor-wise"
                        : clinic.booking_mode === "department"
                          ? "Department-wise"
                          : clinic.booking_mode === "custom"
                            ? clinic.doctor_booking_enabled
                              ? "Custom (Doctor-wise)"
                              : clinic.department_booking_enabled
                                ? "Custom (Department-wise)"
                                : "Custom"
                            : "Not configured"}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${clinic.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                        }`}
                    >
                      {clinic.is_active ? "Active" : "Inactive"}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        handleToggleClinicStatus(clinic)
                      }
                      disabled={togglingClinicId !== null}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${clinic.is_active
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                    >
                      {togglingClinicId === clinic.id
                        ? "Updating..."
                        : clinic.is_active
                          ? "Deactivate"
                          : "Activate"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="mt-6">
          <Link
            href="/"
            className="text-sm font-medium text-violet-700 hover:underline dark:text-violet-300"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>

      {/* Add Business modal */}
      {activeModal === "business" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="business-modal-title"
            className="relative max-h-[92vh] w-full max-w-[610px] overflow-y-auto rounded-2xl border border-slate-200 bg-[#f7f7fb] p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-7"
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close dialog"
              className="absolute right-4 top-3 text-2xl leading-none text-slate-500 transition hover:text-slate-900 dark:hover:text-white"
            >
              ×
            </button>

            <h2
              id="business-modal-title"
              className="pr-8 text-[23px] font-semibold tracking-tight"
            >
              Start a New Business
            </h2>

            <p className="mt-1.5 pr-1 text-[16px] leading-6 text-slate-500">
              Set up a new business with its business type and address.
            </p>

            <form
              onSubmit={handleCreateBusiness}
              className="mt-5 space-y-4"
            >
              <div>
                <label
                  htmlFor="business-name"
                  className={labelClass}
                >
                  Business name
                </label>

                <input
                  id="business-name"
                  name="name"
                  required
                  maxLength={150}
                  placeholder="e.g. Prasad's Hospital"
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="business-type"
                  className={labelClass}
                >
                  Business type
                </label>

                <select
                  id="business-type"
                  name="business_type"
                  required
                  defaultValue="Healthcare"
                  className={inputClass}
                >
                  <option value="Healthcare">Healthcare</option>
                  <option value="Restaurant">Restaurant</option>
                  <option value="Retail">Retail</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="business-address"
                  className={labelClass}
                >
                  Business address
                </label>

                <input
                  id="business-address"
                  name="location_name"
                  required
                  maxLength={150}
                  placeholder="e.g. Kukatpally, Hyderabad"
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-[55px] rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="h-[55px] rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create business"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
