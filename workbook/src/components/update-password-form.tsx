"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message || "The password could not be updated.");
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login?password=updated");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <div>
        <label className="label" htmlFor="new-password">New password</label>
        <div className="relative">
          <input
            id="new-password"
            className="field pr-12"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShow((current) => !current)}
            className="absolute right-1 top-0 flex h-11 w-11 cursor-pointer items-center justify-center text-slate-400 hover:text-slate-600"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="confirm-password">Confirm new password</label>
        <input
          id="confirm-password"
          className="field"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          minLength={8}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
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
          <><LoaderCircle className="animate-spin" size={18} /> Updating…</>
        ) : (
          <><LockKeyhole size={18} /> Update password</>
        )}
      </button>
    </form>
  );
}
