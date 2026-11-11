"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBusinessAction } from "@/app/clinics/actions";

type BusinessModalProps = {
  open: boolean;
  onClose: () => void;
};

const inputClass =
  "h-[44px] w-full rounded-lg border border-slate-200 bg-transparent px-3.5 text-[15px] text-slate-800 outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-violet-950";

const labelClass =
  "mb-1.5 block text-[15px] font-medium text-slate-500";

export default function BusinessModal({
  open,
  onClose,
}: BusinessModalProps) {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose, submitting]);

  useEffect(() => {
    if (open) {
      setSubmitting(false);
      setErrorMessage("");
      setSuccessMessage("");
    }
  }, [open]);

  if (!open) return null;

  async function handleBusinessSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const formData = new FormData(event.currentTarget);
      const result = await createBusinessAction(formData);

      if (!result.success) {
        setErrorMessage(
          result.error ?? "Unable to create the business."
        );
        return;
      }

      setSuccessMessage("Business created successfully.");

      router.refresh();

      // Close the dialog after showing the success message.
      window.setTimeout(() => {
        onClose();
      }, 700);
    } catch (error) {
      console.error("Business submission failed:", error);

      setErrorMessage(
        "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function closeModal() {
    if (!submitting) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
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
        className="relative max-h-[90vh] w-full max-w-[460px] overflow-y-auto rounded-xl bg-[#f7f7fb] p-5 text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-slate-100 sm:p-6"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={closeModal}
          disabled={submitting}
          aria-label="Close dialog"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center text-2xl leading-none text-slate-500 hover:text-slate-900 disabled:opacity-50 dark:hover:text-white"
        >
          ×
        </button>

        {/* Heading */}
        <h2
          id="business-modal-title"
          className="pr-8 text-[20px] font-semibold tracking-tight"
        >
          Start a New Business
        </h2>

        <p className="mt-1 text-[15px] leading-[22px] text-slate-500">
          Set up a business with its business type and address.
        </p>

        {/* Business form */}
        <form
          onSubmit={handleBusinessSubmit}
          className="mt-4 space-y-3"
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

          {/* Form buttons */}
          <div className="flex justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={closeModal}
              disabled={submitting}
              className="h-[44px] rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="h-[44px] rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create business"}
            </button>
          </div>
        </form>

        {/* Error feedback */}
        {errorMessage && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {errorMessage}
          </p>
        )}

        {/* Success feedback */}
        {successMessage && (
          <p
            role="status"
            className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            {successMessage}
          </p>
        )}
      </section>
    </div>
  );
}