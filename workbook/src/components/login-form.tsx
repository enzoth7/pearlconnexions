"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) { setError("Email or password is incorrect."); setLoading(false); return; }
    router.push("/"); router.refresh();
  }
  return <form onSubmit={submit} className="mt-8 space-y-5">
    <div><label className="label" htmlFor="email">Email address</label><input className="field" id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
    <div><label className="label" htmlFor="password">Password</label><div className="relative"><input className="field pr-12" id="password" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /><button className="absolute right-1 top-0 flex h-11 w-11 cursor-pointer items-center justify-center text-slate-500" type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
    <button className="btn btn-primary w-full" disabled={loading}>{loading ? <><LoaderCircle className="animate-spin" size={18}/> Signing in</> : <><LockKeyhole size={18}/> Sign in</>}</button>
  </form>;
}
