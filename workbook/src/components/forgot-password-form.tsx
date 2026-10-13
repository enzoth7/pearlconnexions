"use client";

import Link from "next/link";
import { useState } from "react";
import { LoaderCircle, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const redirectTo = `${window.location.origin}/auth/callback?next=/update-password`;
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);
    if (resetError) {
      setError("We could not send the recovery email. Please try again shortly.");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="mt-6 space-y-5">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-bold">Check your email</p>
          <p className="mt-1 leading-6">
            If an account exists for that address, a password recovery link has been sent. Check your spam folder too.
          </p>
        </div>
        <Link href="/login" className="btn btn-secondary w-full">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <div>
        <label className="label" htmlFor="recovery-email">
          Email address
        </label>
        <input
          className="field"
          id="recovery-email"
          type="email"
          autoComplete="email"
          placeholder="name@pearlconnexions.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}
      <button className="btn btn-primary w-full shadow-md" disabled={loading}>
        {loading ? (
          <><LoaderCircle className="animate-spin" size={18} /> Sending…</>
        ) : (
          <><Mail size={18} /> Send recovery email</>
        )}
      </button>
      <Link href="/login" className="block text-center text-sm font-bold text-[#007A91] hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}
