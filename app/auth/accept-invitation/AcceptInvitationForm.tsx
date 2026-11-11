
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { acceptTeamInvitation } from "./actions";

type Props = {
  invitationId: string;
};

export default function AcceptInvitationForm({ invitationId }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setNotice("");

    if (password.length < 8) {
      setNotice("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setNotice("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      // Set the invited user's password.
      const { error: passwordError } = await supabase.auth.updateUser({
        password,
      });

      if (passwordError) {
        setNotice(passwordError.message);
        return;
      }

      // Activate the clinic membership.
      const result = await acceptTeamInvitation(invitationId);

      if (!result.success) {
        setNotice(result.message);
        return;
      }

      setNotice("Invitation accepted! Redirecting...");

      // Redirect to the common role-based dashboard.
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Acceptance error:", error);
      setNotice("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome to SamayQ
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your invitation has been verified. Create a password to activate your staff account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Create password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter at least 8 characters"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-slate-700"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          {notice && (
            <p
              role="status"
              aria-live="polite"
              className="rounded-lg bg-violet-50 p-3 text-sm leading-6 text-violet-800"
            >
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Activating account..." : "Accept Invitation"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Secure staff account activation powered by SamayQ.
        </p>
      </section>
    </main>
  );
}
