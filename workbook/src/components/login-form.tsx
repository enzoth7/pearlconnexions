"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type LoginFormProps = {
  passwordUpdated?: boolean;
  recoveryError?: boolean;
};

export function LoginForm({ passwordUpdated = false, recoveryError = false }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email or password is incorrect.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      {passwordUpdated && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          Password updated. You can now sign in with your new password.
        </p>
      )}
      {recoveryError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
          This recovery link is invalid or has expired. Request a new one below.
        </p>
      )}
      <div>
        <label className="label" htmlFor="email">
          Email address
        </label>
        <input
          className="field"
          id="email"
          type="email"
          autoComplete="email"
          placeholder="name@pearlconnexions.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <div className="flex items-center justify-between gap-3">
          <label className="label" htmlFor="password">
            Password
          </label>
          <Link href="/forgot-password" className="text-xs font-bold text-[#007A91] hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            className="field pr-12"
            id="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            className="absolute right-1 top-0 flex h-11 w-11 cursor-pointer items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800 border border-red-200">
          {error}
        </p>
      )}
      <button className="btn btn-primary w-full shadow-md" disabled={loading}>
        {loading ? (
          <>
            <LoaderCircle className="animate-spin" size={18} /> Signing in…
          </>
        ) : (
          <>
            <LockKeyhole size={18} /> Sign in
          </>
        )}
      </button>
    </form>
  );
}

