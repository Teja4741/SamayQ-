
"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  saveProfile,
  resendEmailVerification,
  verifyEmailCode,
} from "./actions";

type Props = {
  email: string;
  fullName: string;
  phone: string;
  isEmailVerified: boolean;
};

export default function AccountClient({
  email,
  fullName,
  phone,
  isEmailVerified,
}: Props) {
  const router = useRouter();

  const [name, setName] = useState(fullName);
  const [phoneNumber, setPhoneNumber] = useState(phone);
  const [code, setCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function showResult(success: boolean, text: string) {
    setIsError(!success);
    setMessage(text);
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    startTransition(async () => {
      const result = await saveProfile(name, phoneNumber);
      showResult(result.success, result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleResend() {
    setMessage("");

    startTransition(async () => {
      const result = await resendEmailVerification();
      showResult(result.success, result.message);

      if (result.success && !result.message.includes("already verified")) {
        setShowCodeInput(true);
      }

      if (result.success && result.message.includes("already verified")) {
        router.refresh();
      }
    });
  }

  function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    startTransition(async () => {
      const result = await verifyEmailCode(code);
      showResult(result.success, result.message);

      if (result.success) {
        setCode("");
        setShowCodeInput(false);
        router.refresh();
      }
    });
  }

  const cardClass =
    "rounded-2xl border border-[#e0e4ef] bg-white p-5 shadow-sm md:p-7";

  const inputClass =
    "mt-2 w-full rounded-xl border border-[#dce1ed] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#6557ff] focus:ring-2 focus:ring-[#6557ff]/10";

  const buttonClass =
    "inline-flex items-center justify-center rounded-xl bg-[#6557ff] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#5145e8] disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="mt-8 space-y-6">
      {/* Profile Details */}
      <section className={cardClass}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Profile Details</h2>
            <p className="mt-1 text-sm text-[#65718a]">
              Your name and login contact details.
            </p>
          </div>

          <span className="rounded-full bg-[#f0edff] px-3 py-1 text-xs font-semibold tracking-wide text-[#6557ff]">
            OWNER
          </span>
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="fullName"
              className="text-sm font-medium text-[#344054]"
            >
              Full Name
            </label>

            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your full name"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="text-sm font-medium text-[#344054]"
            >
              Phone Number
            </label>

            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={30}
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="No phone number linked"
              className={inputClass}
            />

            {!phoneNumber.trim() && (
              <p className="mt-2 text-xs text-[#8791a5]">
                No phone number linked
              </p>
            )}
          </div>

          <button type="submit" disabled={isPending} className={buttonClass}>
            {isPending ? "Saving..." : "Save changes"}
          </button>
        </form>
      </section>

      {/* Email & Notifications */}
      <section className={cardClass}>
        <div>
          <h2 className="text-xl font-semibold">Email &amp; Notifications</h2>

          <p className="mt-1 text-sm text-[#65718a]">
            Manage your email address and verification status.
          </p>
        </div>

        <div
          className={`mt-5 rounded-xl border p-4 ${
            isEmailVerified
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`text-sm font-semibold ${
                isEmailVerified ? "text-emerald-800" : "text-amber-800"
              }`}
            >
              {isEmailVerified ? "Email Verified" : "Pending Verification"}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                isEmailVerified
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {isEmailVerified ? "Verified" : "Action required"}
            </span>
          </div>

          <p className="mt-2 text-sm text-[#536177]">
            {isEmailVerified
              ? "Your email has been verified."
              : "Email verification may be required for billing notices, receipts, and account recovery. Check your SamayQ account requirements."}
          </p>
        </div>

        <div className="mt-6">
          <label
            htmlFor="email"
            className="text-sm font-medium text-[#344054]"
          >
            Email Address
          </label>

          <input
            id="email"
            type="email"
            value={email}
            readOnly
            className={`${inputClass} bg-[#f8f9fc] text-[#68758d]`}
          />

          <p className="mt-2 text-xs text-[#8791a5]">
            Your email is managed through your authentication account.
          </p>
        </div>

        {!isEmailVerified && (
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleResend}
              disabled={isPending}
              className={buttonClass}
            >
              {isPending ? "Please wait..." : "Verify Email Now"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowCodeInput((current) => !current);
                setMessage("");
              }}
              className="inline-flex items-center justify-center rounded-xl border border-[#dce1ed] px-5 py-3 text-sm font-medium text-[#344054] transition hover:bg-[#f8f9ff]"
            >
              I already have a code
            </button>
          </div>
        )}

        {!isEmailVerified && showCodeInput && (
          <form
            onSubmit={handleVerify}
            className="mt-5 rounded-xl border border-[#e0e4ef] bg-[#f8f9ff] p-4"
          >
            <label
              htmlFor="verificationCode"
              className="text-sm font-medium text-[#344054]"
            >
              Verification Code
            </label>

            <input
              id="verificationCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,8}"
              minLength={6}
              maxLength={8}
              required
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 8))
              }
              placeholder="Enter the code from your email"
              className={inputClass}
            />

            <button
              type="submit"
              disabled={isPending}
              className={`${buttonClass} mt-4`}
            >
              {isPending ? "Verifying..." : "Verify email"}
            </button>
          </form>
        )}
      </section>

      {/* Password & Security */}
      <section className={cardClass}>
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f0edff] text-[#6557ff]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </div>

          <div className="flex-1">
            <h2 className="text-xl font-semibold">Password &amp; Security</h2>

            <p className="mt-1 text-sm text-[#65718a]">
              Update your account password.
            </p>

            <a
              href="/auth/update-password"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#dce1ed] px-4 py-3 text-sm font-medium transition hover:border-[#bdb6ff] hover:bg-[#fafaff]"
            >
              Change password <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* Autopay & Billing */}
      <section className={cardClass}>
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e9f7ef] text-[#16834a]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 10h18M7 15h4" />
            </svg>
          </div>

          <div className="flex-1">
            <h2 className="text-xl font-semibold">Autopay &amp; Billing</h2>

            <p className="mt-1 text-sm text-[#65718a]">
              Configure automatic extra-usage payment mandates.
            </p>

            <a
              href="/admin/my-plan"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#dce1ed] px-4 py-3 text-sm font-medium transition hover:border-[#bdb6ff] hover:bg-[#fafaff]"
            >
              Manage plan &amp; autopay{" "}
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* Action feedback */}
      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl border p-4 text-sm ${
            isError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
